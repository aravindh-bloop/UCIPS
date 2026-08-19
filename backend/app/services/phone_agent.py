import json

from google.genai import types

from app.services.gemini_client import MODEL_NAME, generate_with_retry
from app.services.llm_extraction import CATEGORIES

PHONE_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "description": {"type": "string"},
        "severity": {"type": "integer"},
        "location_description": {"type": "string"},
        "ready": {"type": "boolean"},
        "spoken_reply": {"type": "string"},
    },
    "required": ["category", "description", "severity", "location_description", "ready", "spoken_reply"],
}

SYSTEM_PROMPT = """You are the phone intake agent for UCIPS, a civic infrastructure complaint system in India.
A citizen has called in to report an infrastructure problem by voice. You are given the full transcript of
the call so far (their speech, transcribed automatically -- it may be in Tamil, Hindi, English, or a mix,
and may contain transcription errors). From this, extract:
- category: the single best-fitting infrastructure category from the allowed list
- description: a clean, concise English restatement of the problem (1-2 sentences)
- severity: an integer 1-5 (1 = minor inconvenience, 5 = urgent public safety hazard)
- location_description: any area, street, or landmark name the caller has mentioned, in their own words.
  Empty string if they have not mentioned any location yet.
- ready: true only if you have enough to file the report -- the problem itself is reasonably clear AND
  location_description is non-empty. false otherwise.
- spoken_reply: what to say back to the caller next, IN THE SAME LANGUAGE they have been speaking.
  If ready is false, this must be exactly ONE short, natural spoken question -- almost always asking for
  their location/area if that's what's missing, otherwise asking the one clearest missing detail.
  If ready is true, this must be a short, warm confirmation that their report has been received (do not
  invent a reference code, one will be appended separately).
Never ask more than one question. Never ask for information already given. Keep spoken_reply brief --
this is a phone call, not a chat window."""


def run_phone_turn(transcript_so_far: str, force_ready: bool) -> dict:
    """One reasoning turn over the accumulated call transcript. `force_ready` is set once the
    turn cap is hit, so a long-winded or confused call still terminates with whatever was
    understood rather than looping forever."""
    prompt = f"{SYSTEM_PROMPT}\n\nCall transcript so far:\n{transcript_so_far}"
    if force_ready:
        prompt += "\n\nThis is the final turn -- you MUST set ready=true and file the report with your best understanding of category/description/severity/location_description even if imperfect, since the caller cannot be asked anything further."

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PHONE_SCHEMA,
            temperature=0.2,
        ),
    )
    data = json.loads(response.text)
    data["severity"] = max(1, min(5, int(data.get("severity", 3))))
    if data.get("category") not in CATEGORIES:
        data["category"] = "other"
    if force_ready:
        data["ready"] = True
    return data
