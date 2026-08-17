import json

from google.genai import types

from app.db.models import Complaint
from app.services.gemini_client import MODEL_NAME, generate_with_retry

EVIDENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "infra_assessment": {"type": "string"},
        "risk_flags": {"type": "array", "items": {"type": "string"}},
        "validated": {"type": "boolean"},
        "validation_reasoning": {"type": "string"},
    },
    "required": ["infra_assessment", "risk_flags", "validated", "validation_reasoning"],
}

PROMPT_TEMPLATE = """You are the Evidence Agent for UCIPS, a civic infrastructure prioritization system.
A cluster of {count} citizen complaints has formed in the "{category}" category, ward "{ward}".

Ward baseline context (from municipal records, may or may not be directly relevant to this specific cluster):
- Estimated population: {population}
- Area type: {area_type}
- Known existing infrastructure notes: {infra_notes}

Actual citizen complaints in this cluster:
{complaint_list}

Cross-check the complaints against the ward baseline and assess:
- infra_assessment: 1-2 sentences synthesizing what this specific cluster's infrastructure problem actually is, informed by both the complaint content and the ward baseline. Be specific to what citizens reported, not generic.
- risk_flags: a short list of specific risk tags that apply here (e.g. flooding_risk, safety_hazard, public_health_concern, traffic_disruption, structural_damage, fire_risk, electrical_hazard) — only include ones actually supported by the complaints.
- validated: true if this cluster represents a credible, internally consistent, actionable infrastructure problem worth prioritizing for funding; false if the complaints seem inconsistent, too sparse/vague, or don't describe a genuine infrastructure issue.
- validation_reasoning: one sentence explaining the validated decision, referencing the actual evidence."""


def analyze_evidence(cluster_category: str, ward_name: str, members: list[Complaint], ward_baseline: dict) -> dict:
    complaint_list = "\n".join(f"- (severity {m.severity or '?'}/5) {m.description or m.raw_text or m.transcript or 'no description'}" for m in members)

    prompt = PROMPT_TEMPLATE.format(
        count=len(members),
        category=cluster_category,
        ward=ward_name,
        population=ward_baseline["population_estimate"],
        area_type=ward_baseline["area_type"],
        infra_notes=ward_baseline["existing_infra_notes"],
        complaint_list=complaint_list,
    )

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EVIDENCE_SCHEMA,
            temperature=0.2,
        ),
    )
    return json.loads(response.text)
