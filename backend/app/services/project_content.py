import json

from google.genai import types

from app.db.models import Complaint
from app.services.gemini_client import MODEL_NAME, generate_with_retry

CONTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
    },
    "required": ["title", "description"],
}

PROMPT_TEMPLATE = """You are the Project Generation Agent for UCIPS, a civic infrastructure prioritization system.
A demand hotspot has been validated in the "{category}" category, based on {count} citizen complaints.

Evidence Agent's assessment: {infra_assessment}

Sample citizen complaints:
{complaint_list}

Propose ONE concrete infrastructure intervention project that addresses this specific hotspot. Give:
- title: a short, specific project name (5-8 words) grounded in what citizens actually reported, not a generic category label
- description: 1-2 sentences describing the concrete intervention and how it resolves the reported problem"""


def generate_project_content(category: str, members: list[Complaint], infra_assessment: str) -> dict:
    complaint_list = "\n".join(f"- {m.description or m.raw_text or m.transcript or 'no description'}" for m in members[:8])

    prompt = PROMPT_TEMPLATE.format(
        category=category,
        count=len(members),
        infra_assessment=infra_assessment,
        complaint_list=complaint_list,
    )

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CONTENT_SCHEMA,
            temperature=0.4,
        ),
    )
    return json.loads(response.text)
