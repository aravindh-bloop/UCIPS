import json

from google.genai import types

from app.services.gemini_client import MODEL_NAME, generate_with_retry
from app.services.llm_extraction import CATEGORIES

VISION_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "description": {"type": "string"},
        "severity": {"type": "integer"},
    },
    "required": ["category", "description", "severity"],
}

VISION_PROMPT_TEMPLATE = """You are the intake agent for UCIPS, a civic infrastructure complaint system in India.
Look at this photo of a reported infrastructure problem{caption_note}. Extract:
- category: the single best-fitting infrastructure category from the allowed list, based on what is visible
- description: a concise English description of the visible problem (1-2 sentences)
- severity: an integer 1-5 (1 = minor inconvenience, 5 = urgent public safety hazard)
Respond in English."""


def analyze_image(image_bytes: bytes, mime_type: str, caption: str | None = None) -> dict:
    caption_note = f', captioned by the citizen as: "{caption}"' if caption else ""
    prompt = VISION_PROMPT_TEMPLATE.format(caption_note=caption_note)

    response = generate_with_retry(
        model=MODEL_NAME,
        contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type=mime_type)],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=VISION_SCHEMA,
            temperature=0.2,
        ),
    )
    data = json.loads(response.text)
    data["severity"] = max(1, min(5, int(data.get("severity", 3))))
    if data.get("category") not in CATEGORIES:
        data["category"] = "other"
    return data
