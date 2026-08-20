import json

from google.genai.errors import ClientError
from google.genai import types

from app.services.gemini_client import MODEL_NAME, call_with_retry, get_client

SCHEME_SCHEMA = {
    "type": "object",
    "properties": {
        "schemes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "provider": {"type": "string"},
                    "eligibility": {"type": "string"},
                    "benefit": {"type": "string"},
                    "how_to_apply": {"type": "string"},
                },
                "required": ["name", "provider", "eligibility", "benefit", "how_to_apply"],
            },
        },
    },
    "required": ["schemes"],
}


def discover_schemes(profession: str, state: str, age: int | None, notes: str | None) -> dict:
    """Real lookup -- no scheme content is authored or seeded by us. Tries a genuinely
    Search-grounded lookup first; if that specifically fails (e.g. grounding requires a billed
    Google Cloud project, which a free-tier key may not have), falls back to a plain,
    ungrounded Gemini call using the model's own trained knowledge -- still real reasoning,
    just without live citations. The response always says which path produced it (`grounded`),
    so the app can be honest with the citizen about which kind of answer they're seeing rather
    than silently blurring the two together.
    """
    client = get_client()

    age_clause = f"a {age}-year-old" if age else "a"
    notes_clause = f" Additional context from the citizen: {notes}." if notes else ""
    scheme_request = (
        f"real, currently active Indian government welfare schemes (both central government "
        f"and {state} state government) that {age_clause} person working as a {profession} "
        f"may be eligible for.{notes_clause} For each scheme, describe: the scheme's exact "
        f"name, which government/department runs it, its eligibility criteria, the benefit it "
        f"provides, and how to apply. List the 3-6 most relevant, currently active schemes. Do "
        f"not invent scheme names -- only report schemes you have real evidence for."
    )

    try:
        return _discover_grounded(client, scheme_request)
    except ClientError:
        # Grounding specifically unavailable (seen in practice: free-tier keys get 429 on the
        # very first grounded call, even brand new ones -- this looks like a billing gate on
        # Google's side, not a quota counter that recovers). Fall back rather than fail the
        # whole feature.
        return _discover_ungrounded(client, scheme_request)


def _discover_grounded(client, scheme_request: str) -> dict:
    """Two genuine reasoning passes: Gemini's Google Search grounding tool and structured
    (response_schema) output cannot be used in the same call (a real, documented API
    limitation), so step 1 actually searches the web and returns citations, and step 2
    reformats that research into clean structured JSON."""
    research = call_with_retry(
        client.models.generate_content,
        model=MODEL_NAME,
        contents=f"Search for {scheme_request}",
        config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]),
    )

    sources: list[dict] = []
    grounding = research.candidates[0].grounding_metadata if research.candidates else None
    if grounding and grounding.grounding_chunks:
        for chunk in grounding.grounding_chunks:
            if chunk.web and chunk.web.uri:
                sources.append({"title": chunk.web.title or chunk.web.uri, "uri": chunk.web.uri})

    structure_prompt = (
        "Convert the following research into the requested structured format. Only include "
        "schemes that are actually described in the research below -- do not add any scheme "
        "not present in the text.\n\nResearch:\n" + (research.text or "")
    )
    structured = call_with_retry(
        client.models.generate_content,
        model=MODEL_NAME,
        contents=structure_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SCHEME_SCHEMA,
            temperature=0.1,
        ),
    )

    data = json.loads(structured.text)
    return {"schemes": data.get("schemes", []), "sources": sources, "grounded": True}


def _discover_ungrounded(client, scheme_request: str) -> dict:
    """One call, no search tool, so response_schema can be used directly. Still genuine
    reasoning over the model's own trained knowledge -- just not verified against a live
    search, and honestly reported as such via `grounded: False`."""
    structured = call_with_retry(
        client.models.generate_content,
        model=MODEL_NAME,
        contents=f"List {scheme_request}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SCHEME_SCHEMA,
            temperature=0.1,
        ),
    )
    data = json.loads(structured.text)
    return {"schemes": data.get("schemes", []), "sources": [], "grounded": False}
