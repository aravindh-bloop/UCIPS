# UCIPS — Unified Citizen-led Infrastructure Prioritization System

A multilingual, AI-powered civic intelligence platform. Citizens report infrastructure problems (text, voice, or photo) from a mobile app; AI structures the reports, clusters similar ones into geographic demand hotspots, cross-checks them against ward evidence, generates candidate infrastructure projects, ranks them with an explainable scoring model, and optimizes which set to fund under a budget via a real 0/1 knapsack solver. Authorities review and approve; citizens track status and leave feedback.

Built as a hackathon project. Full build log, what's genuinely real vs. simulated/deferred, and every gotcha hit along the way: [`TASKS.md`](TASKS.md).

## Repo layout

```
UCIPS/
  backend/     FastAPI + PostgreSQL — the AI pipeline (see backend/README.md)
  mobile/      React Native + Expo — citizen and authority apps
  TASKS.md     Build log / progress tracker
```

## Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, PostgreSQL |
| AI reasoning | Google Gemini — structured extraction, vision, embeddings |
| Speech | Sarvam AI — speech-to-text / text-to-speech (English + Indian languages) |
| Clustering | HDBSCAN |
| Optimization | 0/1 knapsack (custom DP) |
| Mobile | React Native, Expo SDK 57, TypeScript, React Navigation, Reanimated |

## Quick start

You'll need both the backend and the mobile app running, plus a phone (or emulator) connected for the mobile side.

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/ucips
JWT_SECRET=<any random string>
GEMINI_API_KEY=<from aistudio.google.com/apikey>
SARVAM_API_KEY=<from dashboard.sarvam.ai>
```

(Twilio vars can stay blank — phone-call intake is not wired up yet, see [`TASKS.md`](TASKS.md).)

Create the database, then the tables:

```bash
psql -U postgres -c "CREATE DATABASE ucips;"
python -m app.db.init_db
```

Optional: seed one demo ward with ~58 synthetic complaints so hotspots/projects aren't empty on first run (safe to run once; no-ops if data already exists):

```bash
python -m app.seed.seed_data
```

Run it:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

API docs at `http://localhost:8010/docs`. Full endpoint reference: [`backend/API_CONTRACT.md`](backend/API_CONTRACT.md). More backend detail: [`backend/README.md`](backend/README.md).

### 2. Mobile app

```bash
cd mobile
npm install
```

The app talks to the backend at `http://localhost:8010` by default (see `mobile/src/config.ts`). To run on a physical Android phone over USB debugging:

```bash
npm run dev:android
```

This forwards both the Metro bundler port and the backend port over `adb` (`adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8010 tcp:8010`), then starts Expo. Open the project in **Expo Go** (no custom dev client needed — everything runs on plain Expo Go).

If your phone and dev machine are on the same wifi network instead, you can skip `adb reverse` and just run `npx expo start`, but you'll need to change `API_BASE_URL` in `mobile/src/config.ts` to your machine's LAN IP.

### 3. Try it

Register a citizen account in the app, submit a report (text/voice/photo), then register a second account with the **authority** role to see hotspots, ranked projects, and run the budget optimizer.

## Project status

- Full pipeline is implemented and tested end-to-end: intake (text/voice/photo) → AI extraction → clustering → evidence agent → project generation → prioritization → budget optimization → approval.
- **Not implemented**: Twilio phone-call intake (deferred), WhatsApp/Telegram channels, live GIS/demographic data (uses one curated demo ward instead of a live pipeline).
- Free-tier API quotas (Gemini, Sarvam) are limited — see [`TASKS.md`](TASKS.md) for the gotchas hit and how the retry/fallback logic handles it.

## Contributing / running tests

```bash
cd backend && python -m pytest tests/ -v
cd mobile && npx tsc --noEmit
```
