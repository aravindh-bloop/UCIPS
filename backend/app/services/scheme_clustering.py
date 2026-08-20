import hdbscan
import numpy as np
from sqlalchemy.orm import Session

from app.db.models import SchemeGrievance, SchemeGrievanceCluster
from app.services.scheme_grievance_agent import synthesize_escalation

MIN_CLUSTER_SIZE = 3


def recompute_scheme_clusters(db: Session) -> list[SchemeGrievanceCluster]:
    """Clusters diagnosed grievances by embedding similarity of their failure_description --
    deliberately per scheme_name, and deliberately NOT by geography or by any predefined
    taxonomy of failure types. Two people 200km apart can share the exact same broken process
    (same real cluster); two neighbors can fail for unrelated reasons (different clusters) --
    location tells you nothing useful here, only what the failure actually was."""
    scheme_names = [
        row[0]
        for row in db.query(SchemeGrievance.scheme_name)
        .filter(SchemeGrievance.embedding.isnot(None))
        .distinct()
        .all()
    ]

    touched_ids: set[int] = set()

    for scheme_name in scheme_names:
        grievances = (
            db.query(SchemeGrievance)
            .filter(SchemeGrievance.scheme_name == scheme_name, SchemeGrievance.embedding.isnot(None))
            .all()
        )
        if len(grievances) < MIN_CLUSTER_SIZE:
            continue

        for g in grievances:
            g.cluster_id = None

        vectors = np.array([g.embedding for g in grievances])
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=MIN_CLUSTER_SIZE,
            min_samples=1,
            metric="euclidean",
            allow_single_cluster=True,
        )
        labels = clusterer.fit_predict(vectors)

        existing = db.query(SchemeGrievanceCluster).filter(SchemeGrievanceCluster.scheme_name == scheme_name).all()
        existing_by_id = {c.id: c for c in existing}
        used_existing: set[int] = set()

        for label in sorted(set(labels)):
            if label == -1:
                continue  # noise -- not enough similarity to call it a shared pattern

            members = [g for g, lbl in zip(grievances, labels) if lbl == label]
            descriptions = [m.failure_description for m in members if m.failure_description]

            # Reuse an existing cluster for this scheme if one isn't already claimed this run,
            # to avoid regenerating (and re-spending Gemini quota on) an escalation summary for
            # a group that hasn't meaningfully changed size.
            reusable = next((c for c in existing if c.id not in used_existing), None)
            if reusable and reusable.member_count == len(members):
                cluster = reusable
                used_existing.add(cluster.id)
            else:
                escalation = synthesize_escalation(scheme_name, descriptions)
                if reusable:
                    cluster = reusable
                    used_existing.add(cluster.id)
                else:
                    cluster = SchemeGrievanceCluster(scheme_name=scheme_name)
                    db.add(cluster)
                    db.flush()
                cluster.failure_signature = escalation["failure_signature"]
                cluster.escalation_summary = escalation["escalation_summary"]
                cluster.member_count = len(members)

            for m in members:
                m.cluster_id = cluster.id
                m.status = "clustered"
            touched_ids.add(cluster.id)

    db.commit()
    return db.query(SchemeGrievanceCluster).filter(SchemeGrievanceCluster.id.in_(touched_ids)).all() if touched_ids else []
