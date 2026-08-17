from datetime import datetime, timezone

import hdbscan
import numpy as np
from sqlalchemy.orm import Session

from app.db.models import Cluster, Complaint

MIN_CLUSTER_SIZE = 3
DEMO_WARD_NAME = "Velachery"

# Max centroid drift (degrees, ~1.1km) for a fresh HDBSCAN group to be considered "the same"
# hotspot as an existing cluster row. Larger than cluster_selection_epsilon below since a
# centroid can shift a bit as members are added, but small enough not to conflate two
# genuinely distinct hotspots of the same category.
MATCH_THRESHOLD = 0.01


def _recency_weight(created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    ca = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
    days_old = max(0.0, (now - ca).total_seconds() / 86400)
    return max(0.3, 1 - days_old / 60)


def _demand_score(members: list[Complaint]) -> float:
    avg_severity = sum(m.severity or 3 for m in members) / len(members)
    avg_recency = sum(_recency_weight(m.created_at) for m in members) / len(members)
    return round(len(members) * avg_severity * avg_recency, 2)


def recompute_all_clusters(db: Session) -> list[Cluster]:
    """Recompute hotspots from current complaints, upserting into existing Cluster rows
    rather than deleting and recreating them. This matters once evidence/projects/budget
    runs reference a cluster by id (Modules 6-7): a delete-and-rebuild approach breaks those
    foreign keys the moment a new complaint arrives after evidence or a project already
    exists for a hotspot. Clusters that no longer match any fresh group are left as-is
    (stale rather than deleted) rather than risk an FK violation on live-submitted data."""
    categories = [row[0] for row in db.query(Complaint.category).distinct().all() if row[0]]

    touched_ids: set[int] = set()

    for category in categories:
        complaints = db.query(Complaint).filter(Complaint.category == category).all()

        for c in complaints:
            c.cluster_id = None

        if len(complaints) < MIN_CLUSTER_SIZE:
            continue

        coords = np.array([[c.lat, c.lng] for c in complaints])
        # allow_single_cluster + a modest cluster_selection_epsilon matter here: with only
        # a handful of complaints per category, HDBSCAN's default stability-based extraction
        # tends to fragment an otherwise-obvious single hotspot into spurious sub-clusters
        # (it's tuned for finding varying-density structure, not "is this one dense blob").
        # This setting is much closer to a plain radius-based grouping, which is what a
        # "demand hotspot" actually means here, while still genuinely running HDBSCAN.
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=MIN_CLUSTER_SIZE,
            min_samples=1,
            cluster_selection_epsilon=0.0035,  # ~390m
            cluster_selection_method="eom",
            allow_single_cluster=True,
            metric="euclidean",
        )
        labels = clusterer.fit_predict(coords)

        existing = db.query(Cluster).filter(Cluster.category == category).all()

        for label in sorted(set(labels)):
            if label == -1:
                continue  # noise, doesn't form a hotspot

            members = [c for c, lbl in zip(complaints, labels) if lbl == label]
            centroid_lat = float(np.mean([m.lat for m in members]))
            centroid_lng = float(np.mean([m.lng for m in members]))

            match = None
            best_dist = MATCH_THRESHOLD
            for candidate in existing:
                if candidate.id in touched_ids:
                    continue
                dist = ((candidate.centroid_lat - centroid_lat) ** 2 + (candidate.centroid_lng - centroid_lng) ** 2) ** 0.5
                if dist <= best_dist:
                    match = candidate
                    best_dist = dist

            if match:
                match.centroid_lat = centroid_lat
                match.centroid_lng = centroid_lng
                match.complaint_count = len(members)
                match.demand_score = _demand_score(members)
                cluster = match
            else:
                cluster = Cluster(
                    centroid_lat=centroid_lat,
                    centroid_lng=centroid_lng,
                    category=category,
                    ward_name=DEMO_WARD_NAME,
                    complaint_count=len(members),
                    demand_score=_demand_score(members),
                    status="open",
                )
                db.add(cluster)
                db.flush()  # assign cluster.id

            touched_ids.add(cluster.id)
            for m in members:
                m.cluster_id = cluster.id
                m.status = "clustered"

    db.commit()
    return db.query(Cluster).filter(Cluster.id.in_(touched_ids)).all() if touched_ids else []
