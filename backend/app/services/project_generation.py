from sqlalchemy.orm import Session

from app.db.models import Cluster, Complaint, EvidenceRecord, Project
from app.services.prioritization import score_project
from app.services.project_content import generate_project_content

# Fallback only -- used when the Gemini-generated title/description call fails or is rate
# limited (see generate_or_update_project). The real path asks the model to synthesize a
# title/description grounded in the cluster's actual complaint content and the Evidence
# Agent's assessment, once per project (not re-generated on every touch).
CATEGORY_TEMPLATES = {
    "drainage": {
        "title": "Stormwater Drainage Improvement",
        "description_template": "Upgrade and desilt the stormwater drainage network to resolve recurring flooding and overflow reported across {count} complaints in this area.",
        "base_cost": 2_500_000,
    },
    "road": {
        "title": "Road Rehabilitation & Safety Improvement",
        "description_template": "Resurface the damaged road stretch and add safety measures (markings, barricades) to address {count} pothole/road-condition complaints.",
        "base_cost": 4_000_000,
    },
    "streetlight": {
        "title": "LED Streetlight Installation & Repair",
        "description_template": "Replace non-functional streetlights with LED fixtures and repair the local grid to address {count} lighting complaints.",
        "base_cost": 800_000,
    },
    "waste_management": {
        "title": "Waste Collection & Bin Upgrade",
        "description_template": "Increase collection frequency and upgrade bin infrastructure to resolve {count} waste management complaints.",
        "base_cost": 600_000,
    },
    "water_supply": {
        "title": "Water Supply Pipeline Repair",
        "description_template": "Repair and reinforce the water supply pipeline network to address {count} water supply complaints.",
        "base_cost": 3_000_000,
    },
    "sanitation": {
        "title": "Public Sanitation Facility Upgrade",
        "description_template": "Upgrade public sanitation facilities and address safety hazards raised across {count} complaints.",
        "base_cost": 1_200_000,
    },
    "electricity": {
        "title": "Electrical Grid Reliability Upgrade",
        "description_template": "Reinforce local electrical infrastructure to address {count} power reliability complaints.",
        "base_cost": 2_000_000,
    },
    "other": {
        "title": "General Infrastructure Assessment",
        "description_template": "Conduct an on-ground assessment to address {count} miscellaneous infrastructure complaints in this area.",
        "base_cost": 1_000_000,
    },
}


def _estimated_cost(category: str, complaint_count: int) -> float:
    template = CATEGORY_TEMPLATES.get(category, CATEGORY_TEMPLATES["other"])
    scale = 1 + 0.05 * max(0, complaint_count - 3)
    return round(template["base_cost"] * scale, -3)


def _estimated_beneficiaries(complaint_count: int, population_estimate: int | None) -> int:
    return int(min(population_estimate or 10000, complaint_count * 750))


def generate_or_update_project(db: Session, cluster: Cluster, evidence: EvidenceRecord) -> Project:
    project = db.query(Project).filter(Project.cluster_id == cluster.id).first()
    members = db.query(Complaint).filter(Complaint.cluster_id == cluster.id).all()

    if project is None:
        # Only generate title/description once, at creation -- this calls Gemini, so it must
        # not re-run on every touch (clusters recompute on every complaint submission).
        try:
            content = generate_project_content(cluster.category, members, evidence.existing_infra_notes or "")
            title, description = content["title"], content["description"]
        except Exception:
            template = CATEGORY_TEMPLATES.get(cluster.category, CATEGORY_TEMPLATES["other"])
            title = template["title"]
            description = template["description_template"].format(count=cluster.complaint_count)

        project = Project(cluster_id=cluster.id, evidence_id=evidence.id, category=cluster.category, title=title, description=description, status="candidate")
        db.add(project)
    else:
        project.evidence_id = evidence.id

    project.estimated_cost = _estimated_cost(cluster.category, cluster.complaint_count)
    project.estimated_beneficiaries = _estimated_beneficiaries(cluster.complaint_count, evidence.population_estimate)

    avg_severity = sum(m.severity or 3 for m in members) / len(members) if members else 3.0
    score_project(project, cluster, avg_severity)

    db.flush()
    return project
