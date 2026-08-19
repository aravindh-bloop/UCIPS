import json

from google.genai import types

from app.services.gemini_client import MODEL_NAME, generate_with_retry

CATEGORIES = [
    "road",
    "drainage",
    "streetlight",
    "water_supply",
    "waste_management",
    "sanitation",
    "electricity",
    "other",
]

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "description": {"type": "string"},
        "severity": {"type": "integer"},
        "follow_up_question": {"type": "string"},
    },
    "required": ["category", "description", "severity"],
}

SYSTEM_PROMPT = """You are the intake agent for UCIPS, a civic infrastructure complaint system in India.
Given a citizen's complaint (raw text, possibly in a regional language, transliterated, or a voice transcript), extract:
- category: the single best-fitting infrastructure category from the allowed list
- description: a clean, concise English restatement of the problem (1-2 sentences)
- severity: an integer 1-5 (1 = minor inconvenience, 5 = urgent public safety hazard)
- follow_up_question: ONE short clarifying question to ask the citizen if the complaint is vague or missing a key detail that would help fix it (e.g. how long it's been an issue, whether it's affecting many people, a nearby landmark). The citizen's GPS location is already captured separately and attached to every report automatically, so NEVER ask for their location, address, or "where is this" -- that is always already known. Leave follow_up_question as an empty string if the complaint is already clear enough.
Always respond in English regardless of the input language."""


def extract_complaint(raw_text: str) -> dict:
    response = generate_with_retry(
        model=MODEL_NAME,
        contents=f"{SYSTEM_PROMPT}\n\nCitizen complaint:\n{raw_text}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EXTRACTION_SCHEMA,
            temperature=0.2,
        ),
    )
    data = json.loads(response.text)
    data["severity"] = max(1, min(5, int(data.get("severity", 3))))
    if data.get("category") not in CATEGORIES:
        data["category"] = "other"
    return data
