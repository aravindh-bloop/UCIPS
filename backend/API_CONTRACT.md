# UCIPS Backend — API Contract

Base URL (local dev): `http://localhost:8010`. Interactive docs at `/docs`. This document is a quick-reference; `/openapi.json` is the source of truth if anything looks out of date.

All timestamps are ISO 8601 with timezone. All authenticated endpoints take `Authorization: Bearer <token>`.

## Auth

### `POST /api/auth/register`
Body:
```json
{ "name": "string", "phone": "string|null", "email": "string|null", "password": "string", "role": "citizen|authority", "preferred_language": "en" }
```
At least one of `phone`/`email` is required. Returns `201` with `Token` (see below). `409` if phone/email already registered, `400` on bad role.

### `POST /api/auth/login`
Body: `{ "identifier": "phone or email", "password": "string" }` → `200` with `Token`. `401` on bad credentials.

**`Token` shape** (returned by register/login):
```json
{ "access_token": "jwt", "token_type": "bearer", "user": { "id": 1, "name": "...", "phone": "...", "email": null, "role": "citizen", "preferred_language": "en", "created_at": "..." } }
```

### `GET /api/auth/me`
Auth required. Returns the current user (`UserOut`, same shape as `user` above minus the token).

## Complaints

**`ComplaintOut` shape** (returned by all complaint endpoints):
```json
{
  "id": 1, "reference_code": "UCIPS-XXXXXX", "channel": "text|voice|image|phone",
  "language": "en", "raw_text": "...", "transcript": "...", "image_url": "/storage/images/...",
  "audio_url": "/storage/audio/...", "category": "road|drainage|streetlight|water_supply|waste_management|sanitation|electricity|other",
  "description": "AI-generated clean description", "severity": 1-5, "lat": 0.0, "lng": 0.0,
  "status": "received|processed|clustered|in_progress|resolved", "created_at": "...",
  "follow_up_question": "string|null"
}
```
`transcript`/`image_url`/`audio_url`/`raw_text` are only populated for the relevant channel. `follow_up_question` is only ever non-null on the response to a fresh submission (not stored, not returned on GET).

### `POST /api/complaints` — text complaint
Auth required (citizen). Body: `{ "text": "string", "lat": 0.0, "lng": 0.0, "language": "en" }` → `201 ComplaintOut`. `502` if the AI extraction service is temporarily down (safe to retry).

### `POST /api/complaints/voice` — voice complaint
Auth required. `multipart/form-data`: `file` (audio, any of wav/mp3/m4a/aac/ogg/opus/flac/webm/amr), `lat`, `lng`, `language_code` (BCP-47, e.g. `hi-IN`, `ta-IN`, or `unknown` to auto-detect) → `201 ComplaintOut`. `422` if no speech could be transcribed, `502` if STT/extraction is temporarily down.

### `POST /api/complaints/image` — image complaint
Auth required. `multipart/form-data`: `file` (image), `lat`, `lng`, `caption` (optional string), `language` (default `en`) → `201 ComplaintOut`. `502` if vision analysis is temporarily down.

### `GET /api/complaints`
Auth required. Citizens get only their own complaints; authorities get all. Returns `ComplaintOut[]`, newest first.

### `GET /api/complaints/{id}`
Auth required. `403` if a citizen requests someone else's complaint. `404` if not found.

### `POST /api/complaints/{id}/feedback`
Auth required, must own the complaint. Body: `{ "rating": 1-5, "comment": "string|null" }` → `201 FeedbackOut`. `409` if feedback already submitted, `400` on out-of-range rating.

### `GET /api/complaints/{id}/feedback`
Auth required (owner, or any authority). `404` if none submitted yet.

## Hotspots (demand clusters)

**`ClusterOut` shape:**
```json
{ "id": 1, "centroid_lat": 0.0, "centroid_lng": 0.0, "category": "...", "ward_name": "Velachery", "complaint_count": 18, "demand_score": 50.15, "status": "open", "created_at": "..." }
```

### `GET /api/hotspots`
No auth required. Returns `ClusterOut[]`, sorted by `demand_score` descending.

### `GET /api/hotspots/{id}`
`404` if not found.

### `GET /api/hotspots/{id}/complaints`
Returns `ComplaintOut[]` belonging to that hotspot.

## Projects (candidate infrastructure interventions)

**`ProjectOut` shape:**
```json
{
  "id": 1, "cluster_id": 5, "evidence_id": 5, "title": "Stormwater Drainage Improvement",
  "category": "drainage", "description": "...", "estimated_cost": 4375000.0, "estimated_beneficiaries": 13500,
  "demand_score": 10.0, "impact_score": 10.0, "urgency_score": 9.22, "feasibility_score": 5.62,
  "priority_score": 8.97, "explanation": "18 complaints (avg severity 4.6/5) form this drainage hotspot...",
  "status": "candidate|selected|approved|rejected", "created_at": "..."
}
```
All the `*_score` fields are 0-10, normalized independently, combined into `priority_score` as `0.3*demand + 0.3*impact + 0.2*urgency + 0.2*feasibility`. `explanation` is a plain-English sentence citing the actual numbers — safe to show directly in a UI.

### `GET /api/projects?sort=priority|cost|recent`
No auth required. Default sort is `priority` (descending).

### `GET /api/projects/{id}`
`404` if not found.

## Budget optimization

**`BudgetRunOut` shape:**
```json
{
  "id": 1, "total_budget": 5080000.0, "total_cost": 5065000.0, "total_expected_impact": 15.47,
  "status": "draft|approved", "created_at": "...",
  "selected": [ /* ProjectOut[] */ ], "excluded": [ /* ProjectOut[] */ ]
}
```

### `POST /api/budget/optimize`
Auth required, **authority role only** (citizen gets `403`). Body: `{ "budget": 5080000 }` → `201 BudgetRunOut`. Runs a real 0/1 knapsack over all non-rejected projects, value = `priority_score`. `400` if budget ≤ 0 or there are no candidate projects.

### `GET /api/budget/runs`
No auth required. All runs, newest first.

### `GET /api/budget/runs/{id}`
`404` if not found.

### `POST /api/budget/runs/{id}/approve`
Auth required, authority only. Marks the run `approved` and flips every selected project's status to `approved`. `409` if already approved.

## Misc

- `GET /api/ping` — liveness check, no DB.
- `GET /api/health` — round-trips through Postgres.
- Static files: anything under `/storage/...` (uploaded images/audio) is served directly.

## Not yet implemented

- Phone-call intake (`/api/phone/*` webhooks) — Twilio integration deferred, see `TASKS.md`.
- Push notifications — out of scope for this build; poll `GET /api/complaints` for status changes instead.
