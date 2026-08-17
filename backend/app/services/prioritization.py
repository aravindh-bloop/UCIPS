from app.db.models import Cluster, Project


def score_project(project: Project, cluster: Cluster, avg_severity: float) -> None:
    """Deterministic, explainable composite scoring -- no LLM call, no black box.
    Each sub-score is normalized to a 0-10 scale before combining so the weights
    (demand 30%, impact 30%, urgency 20%, feasibility 20%) are meaningful."""
    demand_norm = min(10.0, cluster.demand_score / 5)
    impact_norm = min(10.0, project.estimated_beneficiaries / 500)
    urgency_norm = min(10.0, avg_severity * 2)
    feasibility_norm = max(1.0, 10 - project.estimated_cost / 1_000_000)

    priority = 0.3 * demand_norm + 0.3 * impact_norm + 0.2 * urgency_norm + 0.2 * feasibility_norm

    project.demand_score = round(demand_norm, 2)
    project.impact_score = round(impact_norm, 2)
    project.urgency_score = round(urgency_norm, 2)
    project.feasibility_score = round(feasibility_norm, 2)
    project.priority_score = round(priority, 2)
    project.explanation = (
        f"{cluster.complaint_count} complaints (avg severity {avg_severity:.1f}/5) form this {cluster.category} "
        f"hotspot, estimated to affect {project.estimated_beneficiaries:,} residents. "
        f"Demand {project.demand_score}/10, impact {project.impact_score}/10, urgency {project.urgency_score}/10, "
        f"feasibility {project.feasibility_score}/10 (est. cost ₹{project.estimated_cost:,.0f}) "
        f"→ priority score {project.priority_score}/10."
    )
