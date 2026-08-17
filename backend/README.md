# UCIPS Backend

FastAPI backend for UCIPS (Unified Citizen-led Infrastructure Prioritization System). This covers the full pipeline: citizen complaint intake (text/voice/image) → AI extraction → demand clustering → evidence validation → project generation → prioritization → budget optimization. See [`../TASKS.md`](../TASKS.md) for build status and what's real vs. simulated, and [`API_CONTRACT.md`](API_CONTRACT.md) for the full endpoint reference.

**Frontend is out of scope here** — this backend is meant to be built against, not shipped with a UI.

## Requirements

- Python 3.11+
- PostgreSQL 16 (local instance; see below)
- API keys: Gemini (free tier), Sarvam AI (free tier). Twilio is optional/deferred — the app runs fine without it, just without the phone-call intake channel.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5432/ucips
JWT_SECRET=<any random string>
GEMINI_API_KEY=<from aistudio.google.com/apikey>
SARVAM_API_KEY=<from dashboard.sarvam.ai>
```

Create the database (once):

```bash
psql -U postgres -c "CREATE DATABASE ucips;"
```

Create tables:

```bash
python -m app.db.init_db
```

Optionally seed demo data (one ward, ~58 synthetic complaints forming 5 demand hotspots, with evidence and generated projects — safe to run once; it no-ops if seed data already exists):

```bash
python -m app.seed.seed_data
```

Run the server:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

Interactive API docs (Swagger UI): `http://localhost:8010/docs`. Health check: `GET /api/health` (round-trips through Postgres).

## Connecting a mobile app to this backend

If the app runs on a physical Android device over USB debugging without shared wifi, forward the port:

```bash
adb reverse tcp:8010 tcp:8010
```

Then point the app's API base URL at `http://localhost:8010`. Uploaded images/audio are served back at `http://localhost:8010/storage/...`.

## Running tests

```bash
python -m pytest tests/ -v
```

## Known gotchas (see TASKS.md for full detail)

- No sponsor credits for Gemini/Sarvam — both are on free tiers with real rate limits. The extraction/vision/embedding services retry with backoff, but avoid firing many requests back-to-back.
- `uvicorn --reload` has been unreliable in this dev environment (stale worker keeps serving old code after edits) — restart the server manually after code changes rather than relying on `--reload`.
