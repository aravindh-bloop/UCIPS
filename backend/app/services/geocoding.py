import requests

# Phone callers have no GPS (unlike the app, which always attaches real coordinates), so a
# location has to be resolved from whatever the caller says out loud. Nominatim (OpenStreetMap)
# is used because it's free and keyless -- consistent with the rest of the project's mapping
# stack (see HotspotMap.tsx) -- rather than a billed geocoding API.
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_HEADERS = {"User-Agent": "UCIPS-Hackathon/1.0 (civic complaint intake)"}

# Same seeded demo ward as clustering.py's DEMO_WARD_NAME. Used only when the caller never
# mentions a resolvable location -- a real fallback, not a silent default; callers hear the
# location back read out before it's used, so this only matters as a last resort.
FALLBACK_LAT = 12.9753
FALLBACK_LNG = 80.2210


def geocode(location_description: str) -> tuple[float, float]:
    """Best-effort geocode of a spoken location description. Falls back to the demo ward's
    centroid on any failure (no match, network error, malformed response) -- a phone complaint
    must never be lost just because free-text geocoding didn't resolve."""
    if not location_description or not location_description.strip():
        return FALLBACK_LAT, FALLBACK_LNG

    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": f"{location_description}, Chennai, India", "format": "json", "limit": 1},
            headers=_HEADERS,
            timeout=8,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:
        pass

    return FALLBACK_LAT, FALLBACK_LNG
