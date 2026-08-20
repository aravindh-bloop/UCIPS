import json

from google.genai import types

from app.services.gemini_client import MODEL_NAME, generate_with_retry

DIAGNOSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "failure_description": {"type": "string"},
        "follow_up_question": {"type": "string"},
        "ready": {"type": "boolean"},
    },
    "required": ["failure_description", "follow_up_question", "ready"],
}

DIAGNOSIS_PROMPT = """You are a benefit-delivery diagnosis agent for a citizen welfare-grievance system in India.
A citizen reports they did not receive a government scheme benefit/payment they believe they are entitled to.
Given their report (and any follow-up answer), diagnose WHERE in the delivery process the failure most likely
occurred -- e.g. Aadhaar-bank account linkage mismatch, dormant or incorrect bank account, missing life
certificate or periodic renewal, application never processed, eligibility documentation rejected, a fraud/
duplicate flag incorrectly blocking a genuine beneficiary, or genuinely unclear.
- failure_description: a concise, specific description in plain English of the likely failure point. Must name
  a specific likely cause, not a vague restatement of "didn't receive it".
- follow_up_question: ONE short, targeted question to ask if the failure point is still unclear (e.g. "did this
  benefit arrive before and then stop, or have you never received it?", "is your bank account linked to
  Aadhaar?"). Leave as an empty string once you have enough to give a specific diagnosis.
- ready: true once failure_description names a specific likely cause. false only if a follow-up question is
  genuinely needed to narrow it down.
Never ask more than one question. Never ask something already answered in the conversation so far."""

ESCALATION_SCHEMA = {
    "type": "object",
    "properties": {
        "failure_signature": {"type": "string"},
        "escalation_summary": {"type": "string"},
    },
    "required": ["failure_signature", "escalation_summary"],
}

ESCALATION_PROMPT = """You are writing a systemic-issue escalation for a government welfare-delivery scheme.
Below are several citizens' diagnosed benefit-delivery failures for the same scheme, grouped together because
they describe similar failure patterns.
- failure_signature: a short, specific label for the shared root cause these reports have in common.
- escalation_summary: 2-3 sentences, written for a government official, explaining that this is not N separate
  individual grievances but evidence of one systemic process failure, naming the likely root cause and
  recommending a fix at the process level (e.g. a bulk re-verification drive) rather than case-by-case
  resolution."""


def diagnose_grievance(conversation_so_far: str, force_ready: bool) -> dict:
    prompt = f"{DIAGNOSIS_PROMPT}\n\nCitizen's report so far:\n{conversation_so_far}"
    if force_ready:
        prompt += "\n\nThis is the final round -- you MUST set ready=true and give your best specific diagnosis even if imperfect."

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DIAGNOSIS_SCHEMA,
            temperature=0.2,
        ),
    )
    data = json.loads(response.text)
    if force_ready:
        data["ready"] = True
    return data


def synthesize_escalation(scheme_name: str, failure_descriptions: list[str]) -> dict:
    joined = "\n".join(f"- {d}" for d in failure_descriptions)
    prompt = f"{ESCALATION_PROMPT}\n\nScheme: {scheme_name}\n\nDiagnosed failures ({len(failure_descriptions)} citizens):\n{joined}"

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ESCALATION_SCHEMA,
            temperature=0.2,
        ),
    )
    return json.loads(response.text)
