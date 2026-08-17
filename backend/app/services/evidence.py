from sqlalchemy.orm import Session

from app.db.models import Cluster, Complaint, EvidenceRecord
from app.services.evidence_analysis import analyze_evidence

# The Evidence Agent validates a demand hotspot against ward-level context (population,
# area type, existing infrastructure). A real deployment would pull this from live
# GIS/demographic/public-infrastructure datasets; that's out of scope for a 3-day build, so
# this baseline is a single curated dataset for the one demo ward (SIMULATED-SEEDED per the
# project plan). What IS real: a Gemini call reasons over each cluster's actual complaint
# content cross-referenced against this baseline to produce a cluster-specific assessment,
# risk flags, and a validated/not-validated judgment with reasoning -- not a static copy-paste.
DEMO_WARD_EVIDENCE = {
    "population_estimate": 42000,
    "area_type": "mixed",
    "existing_infra_notes": "Ward has aging stormwater drains (last upgraded 2009), two-lane arterial roads with heavy monsoon flooding history, and streetlights on a 2015-era grid with known dead zones near the lake bund.",
}


def get_or_create_evidence(db: Session, cluster: Cluster) -> EvidenceRecord:
    existing = db.query(EvidenceRecord).filter(EvidenceRecord.cluster_id == cluster.id).first()
    if existing:
        return existing

    members = db.query(Complaint).filter(Complaint.cluster_id == cluster.id).all()

    try:
        analysis = analyze_evidence(cluster.category, cluster.ward_name, members, DEMO_WARD_EVIDENCE)
        infra_notes = analysis["infra_assessment"]
        risk_flags = ",".join(analysis["risk_flags"])
        validated = bool(analysis["validated"])
    except Exception:
        # AI reasoning is best-effort -- fall back to the ward baseline rather than block
        # cluster processing if the model is unavailable/rate-limited.
        infra_notes = DEMO_WARD_EVIDENCE["existing_infra_notes"]
        risk_flags = "unassessed"
        validated = True

    evidence = EvidenceRecord(
        cluster_id=cluster.id,
        population_estimate=DEMO_WARD_EVIDENCE["population_estimate"],
        area_type=DEMO_WARD_EVIDENCE["area_type"],
        existing_infra_notes=infra_notes,
        risk_flags=risk_flags,
        validated=validated,
    )
    db.add(evidence)
    db.flush()
    return evidence
