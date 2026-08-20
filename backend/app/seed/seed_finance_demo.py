"""Pre-seeds one specific My Finance query into the real SchemeQuery cache table.

This exists because the Gemini free-tier daily quota (~20 requests/day, shared across every
AI-dependent feature in this app) makes a live grounded lookup a real risk to attempt cold in
front of a jury. Rather than adding a separate fake code path, this inserts a row into the
exact same cache table /api/finance/schemes/discover already reads from -- so the demo query
gets a genuinely real cache hit (cached=True is accurate), while every other profession/state
combination still goes through the real, live, Google-Search-grounded pipeline unchanged.

The scheme content itself is real -- sourced from a live web search against the actual
government scheme pages (pmkisan.gov.in, pmfby.gov.in, Tamil Nadu Land Reforms department),
not invented. Age-inappropriate schemes were deliberately left out: PM-KMY's enrollment window
is 18-40 and IGNOAPS requires 60+, so a 45-year-old wouldn't actually be offered either by a
correctly-reasoning lookup.
"""

import json

from app.db.models import SchemeQuery
from app.db.session import SessionLocal

PROFESSION = "farmer"
STATE = "Tamil Nadu"
AGE = 45

SCHEMES = [
    {
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "provider": "Central Government - Ministry of Agriculture and Farmers Welfare",
        "eligibility": "Landholding farmer families with land records seeded in the PM-KISAN portal, an Aadhaar-linked bank account, and completed eKYC.",
        "benefit": "₹6,000 per year, paid in three equal instalments of ₹2,000 directly to the bank account.",
        "how_to_apply": "Register at pmkisan.gov.in or through the local Common Service Centre (CSC) / Village Administrative Officer with land records and Aadhaar.",
    },
    {
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "provider": "Central Government - Ministry of Agriculture and Farmers Welfare",
        "eligibility": "Any farmer growing a notified crop, with or without a crop loan; voluntary for all farmers since Kharif 2020.",
        "benefit": "Crop insurance covering yield loss from natural calamities, pests, and disease, at a low farmer-paid premium share.",
        "how_to_apply": "Register on the National Crop Insurance Portal at pmfby.gov.in before the season's cut-off date, or through your bank/CSC.",
    },
    {
        "name": "Chief Minister's Uzhavar Pathukappu Thittam (CMUPT)",
        "provider": "Government of Tamil Nadu - Land Reforms / Agriculture Department",
        "eligibility": "Registered Tamil Nadu farmers and their dependants, for welfare/security assistance in case of accident, disability, or death.",
        "benefit": "State-funded financial welfare assistance to the farmer or their registered dependants.",
        "how_to_apply": "Apply through the Assistant Director of Agriculture or Village Administrative Officer (VAO) in your taluk.",
    },
    {
        "name": "Kisan Credit Card (KCC)",
        "provider": "Central Government / Nationalised and Cooperative Banks",
        "eligibility": "Farmers (owner-cultivators, tenant farmers, and sharecroppers) engaged in crop production or allied activities.",
        "benefit": "Short-term credit at a subsidised interest rate for crop production, post-harvest expenses, and farm investment needs.",
        "how_to_apply": "Apply at any nationalised or cooperative bank branch, or through the Tamil Nadu Agriculture Department portal.",
    },
]

SOURCES = [
    {"title": "PM-KISAN Official Portal", "uri": "https://pmkisan.gov.in/"},
    {"title": "PMFBY - National Crop Insurance Portal", "uri": "https://pmfby.gov.in/"},
    {"title": "Tamil Nadu Land Reforms - Uzhavar Pathukappu Thittam", "uri": "https://landreforms.tn.gov.in/UPT.html"},
    {"title": "Kisan Credit Card - Wikipedia", "uri": "https://en.wikipedia.org/wiki/Kisan_Credit_Card"},
]


def run() -> None:
    """Deletes and re-inserts rather than skip-if-exists, so this doubles as a demo-day reset:
    the cache lookup only matches rows from the last 24h, so re-running this script right
    before you actually demo keeps the cache hit valid regardless of when it was first seeded."""
    db = SessionLocal()
    try:
        db.query(SchemeQuery).filter(
            SchemeQuery.profession.ilike(PROFESSION), SchemeQuery.state.ilike(STATE), SchemeQuery.age == AGE
        ).delete()

        query = SchemeQuery(
            user_id=None,
            profession=PROFESSION,
            state=STATE,
            age=AGE,
            notes=None,
            result_json=json.dumps({"schemes": SCHEMES, "sources": SOURCES, "grounded": True}),
        )
        db.add(query)
        db.commit()
        print(f"Seeded demo scheme query for profession={PROFESSION!r}, state={STATE!r}, age={AGE}.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
