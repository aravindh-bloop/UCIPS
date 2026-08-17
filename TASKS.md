# UCIPS — Build Tracker

Scope: backend + AI workflows are the core deliverable; a basic (function-over-polish) mobile frontend is now being built alongside so every change can be tested live on a physical Android phone. Full plan: `C:\Users\aravi\.claude\plans\quizzical-scribbling-quiche.md` (backend plan + mobile addendum).
Tags: `[REAL]` genuinely implemented, `[THIN-REAL]` real API but scoped down, `[SIMULATED-SEEDED]` real code over curated data.

## Environment
- [x] Python 3.11 venv (`backend/.venv`)
- [x] PostgreSQL 16 installed locally, `ucips` database created, password in `backend/.env`
- [x] Gemini API key
- [x] Sarvam AI API key
- [~] Twilio account SID/token/phone number — have API Key SID/Secret, still need Account SID + trial number

## Day 1 — Setup, skeleton, auth, text intake
- [x] Module 0: FastAPI scaffold — `GET /api/ping` verified
- [x] Module 1: DB models + schema (8 tables) — `GET /api/health` verified (round-trips through Postgres)
- [x] Module 2: Auth — register/login/JWT/`/me` `[REAL]` — verified: register (citizen+authority), duplicate/invalid-role rejection, login success/failure, protected route with/without/bad token
- [x] Module 3: Text complaint intake + Gemini extraction `[REAL]` — verified: `POST /api/complaints` persists AI-extracted category/description/severity/follow-up question, auth-guarded (401 without token), `GET /api/complaints` scoped to citizen's own

## Day 2 — Voice + vision, demand intelligence, evidence, projects, ranking
- [x] Module 4: Voice intake (Sarvam STT, EN+TA) `[THIN-REAL]` + image intake (Gemini vision) `[REAL]` — verified: TTS→STT round trip exact-match in English and Tamil, `POST /api/complaints/voice` transcribes+extracts+persists, `POST /api/complaints/image` runs Gemini vision+persists, uploaded files served back via `/storage/...` static mount
- [x] Module 5: Seed data (58 synthetic complaints, ward "Velachery") + real Gemini embeddings on live submissions `[REAL]` + HDBSCAN clustering `[REAL]` → `GET /api/hotspots` — verified: 5 hotspots formed matching the seeded groups (drainage 18, road 15, streetlight 10, waste_management 6, plus a small incidental cluster from earlier ad-hoc test complaints at different coordinates), demand scoring formula, drill-down `GET /api/hotspots/{id}/complaints`, upsert-based recompute confirmed both to grow an existing hotspot in place and to leave genuinely scattered points unclustered
- [x] Module 6: Evidence Agent + project generation + explainable prioritization `[REAL]` → `GET /api/projects?sort=priority` — verified: 5 candidate projects generated from the 5 hotspots with sensible rankings (drainage crisis 8.96, cheap/feasible streetlight fix 7.61, tiny 3-complaint cluster lowest at 4.48), each with a plain-English explanation citing the actual numbers; confirmed evidence+project regenerate correctly in place when a new complaint joins an existing hotspot (drainage: 18→19 complaints, cost/priority updated, same project row)
- [x] **Upgraded Evidence Agent + Project Generation from `[SIMULATED-SEEDED]`/template to genuinely `[REAL]`** — previously the Evidence Agent returned the identical hardcoded dict for every hotspot regardless of content, and Project Generation used a fixed per-category template; neither actually reasoned about anything. Now: `evidence_analysis.py` sends each cluster's actual complaint text + the seeded ward baseline to Gemini, which produces a cluster-specific infra assessment, risk flags, and a real `validated: true/false` judgment with reasoning. `project_content.py` similarly generates a tailored title/description grounded in the real complaints (e.g. "Velachery Lake Bund Streetlight Repair and Sparking Pole Replacement" — picked up the specific "sparking pole" detail from one complaint). Both call the LLM only **once per cluster/project** (cached thereafter, on creation only) to keep this safe against the free-tier daily quota — numeric fields (cost, beneficiaries, scores) stay deterministic and recalculate on every touch for free. Both fall back to the old static/template behavior if the Gemini call fails. Ward baseline (population/area type) is still seeded, not live GIS — that data genuinely can't come from anywhere else at hackathon scope, but the *reasoning* over it is now real.

## Day 3 — Budget optimization, phone gateway, feedback, handoff
- [x] Module 7: 0/1 Knapsack budget optimizer `[REAL]` → `POST /api/budget/optimize`, `POST /api/budget/runs/{id}/approve` (authority-only, citizen gets 403) — verified against a constructed case where naive greedy-by-value-density picks a worse combination (14.12) than the true DP optimum (15.47); 5 pytest unit tests in `backend/tests/test_knapsack.py`, including that exact regression case
- [ ] Module 8: Twilio phone gateway `[THIN-REAL]` — **deferred**, skipped for now by request. Have Twilio API Key SID/Secret in `.env` already; still need Account SID (`AC...`) and the trial phone number from the Twilio Console before resuming. ngrok is installed (`Ngrok.Ngrok` via winget) but not yet authenticated — need an ngrok authtoken too.
- [x] Module 9: Feedback endpoint `[REAL]` → `POST /api/complaints/{id}/feedback`, `GET /api/complaints/{id}/feedback` — verified: happy path, duplicate rejection (409), invalid rating (400), ownership check (403). Handoff docs written: [`backend/API_CONTRACT.md`](backend/API_CONTRACT.md) (full endpoint reference) and [`backend/README.md`](backend/README.md) (setup + run instructions) for the frontend team.

## Cut List
- No push notifications, no multi-ward support, no RBAC beyond citizen/authority, no job queue, no migrations tool, no live GIS/demographic ingestion, no real-time duplex voice AI.

## Notes / gotchas hit so far
- `uvicorn --reload` is unreliable on this Windows setup (stale worker keeps serving old code after a file change) — restart manually after edits instead of trusting reload.
- Port 8000 got stuck with a phantom Windows socket listener after a bind conflict — moved dev server to port **8010**.
- `passlib`'s bcrypt backend self-test is broken under `bcrypt==5.0.0` (unrelated `ValueError: password cannot be longer than 72 bytes` on its internal self-test) — bypassed by calling the `bcrypt` package directly instead of through `passlib`.
- `gemini-2.0-flash` / `gemini-2.5-flash` / `gemini-2.5-pro` are all deprecated for this API key now. Free-tier RPM is low enough that we hit 429s during normal testing — extraction service retries with backoff (5s steps on 429, 1.5s steps on 5xx, 4 attempts). No hackathon sponsor credits for Gemini or Sarvam — avoid firing complaints back-to-back on demo day.
- **Bigger quota problem found**: `gemini-flash-latest` resolves to `gemini-3.7-flash`, whose free tier is capped at **20 requests per day per project** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`) — not a per-minute limit, so it doesn't recover in seconds like the 429 retry logic assumes. We burned through it during normal dev testing. Quotas are per-*model*, so switched `MODEL_NAME` in `gemini_client.py` to **`gemini-flash-lite-latest`**, which has its own separate, unused quota — verified it supports structured JSON output and vision (image) input too. **Before demo day**: check remaining quota on whichever model is configured (https://ai.dev/rate-limit), and know that if it runs out again mid-demo, switching `MODEL_NAME` to another untried model name is the fastest recovery (each model has its own 20/day allowance on the free tier).
- Sarvam STT requires an explicit MIME type on the multipart file part or it 400s with "Invalid file type: None" — `stt_tts.py` maps file extension to MIME type explicitly rather than relying on requests' default.
- HDBSCAN's default stability-based cluster extraction fragments small (6-19 point), uniformly-scattered synthetic groups into spurious sub-clusters or pure noise — it's tuned for varying-density structure, not "is this one dense blob". Fixed with `min_samples=1, cluster_selection_epsilon=0.0035, allow_single_cluster=True`. Verified this still keeps genuinely separate hotspots distinct (tested on two ~1.5km-apart synthetic blobs).
- **Important architectural fix**: clustering recompute used to delete-and-rebuild all `Cluster` rows on every new complaint, which crashes with a foreign-key violation the moment anything (evidence, later projects/budget runs) references a cluster by id. Rewrote `recompute_all_clusters` to upsert — match each fresh HDBSCAN group to an existing cluster by centroid proximity (within ~1.1km) and update in place, only inserting a new row when nothing matches. Clusters recompute after every complaint submission (`_finalize_complaint` in `complaints.py`), so this had to be fixed before Module 6 adds FK-dependent data on top of clusters.
- **Real knapsack bug found via testing, not review**: discretizing cost to ₹50,000 units for the DP table caused per-item rounding to sometimes push a combination's *discretized* weight over the budget cap even though the combination's *true* total cost fit comfortably under budget (a real hand-verifiable case: drainage ₹43.75L + waste ₹6.9L = ₹50.65L true cost, budget ₹50.8L — should fit, didn't). Fixed by using ₹1,000 as the unit, matching the rounding already applied when costs are generated, so there's zero discretization error against our own data. Caught by deliberately constructing a case where naive greedy-by-value-density and true DP optimization disagree — now a permanent regression test.
- Test budget-run data from development got cleared and all project statuses reset to `candidate` before demo — re-run `POST /api/budget/optimize` fresh on demo day rather than reusing dev-time runs.

## Demo Script (backend-only walkthrough, via curl/Postman/Swagger UI)

Reset first: `DELETE FROM budget_run_projects; DELETE FROM budget_runs; UPDATE projects SET status='candidate';` (or just don't re-run optimize until demo time).

1. **Register/login as a citizen** — `POST /api/auth/register` (role: citizen). Show the real JWT.
2. **Live voice complaint in Tamil** — `POST /api/complaints/voice` with a Tamil audio recording, coordinates inside the Velachery demo ward (e.g. near 12.975, 80.221 to land in the drainage hotspot). Show the response: real transcript, real AI-extracted category/description/severity, a reference code.
3. **Show it joined a hotspot** — `GET /api/hotspots` — point out the drainage cluster's `complaint_count` went up by one and `demand_score` recalculated, live, from the submission just made.
4. **Show the evidence + generated project** — `GET /api/projects?sort=priority` — the drainage project's cost/beneficiaries/explanation updated too, same project row (not a duplicate).
5. **Login as authority**, `GET /api/projects` — walk through the ranked list and read one `explanation` string aloud — it's plain English citing real numbers, not a black box.
6. **Run the budget optimizer** — `POST /api/budget/optimize` with a budget that forces a real trade-off (e.g. ~₹50-55L, enough for drainage + waste_management but not drainage + road). Point out it's true 0/1 knapsack, not greedy — show `total_expected_impact` and that a cheaper-but-lower-value combination was correctly rejected in favor of a better one.
7. **Approve** — `POST /api/budget/runs/{id}/approve` — selected projects flip to `approved`.
8. **(If a citizen complaint from step 2 exists) Leave feedback** — `POST /api/complaints/{id}/feedback`.

If asked "is this real AI or hardcoded": steps 2-6 all hit live Gemini/Sarvam calls or run real algorithms (HDBSCAN, knapsack DP) over data that updates as new complaints arrive — only the ward-level evidence dataset (population/GIS baseline) is a curated stand-in for a live public-data pipeline, which is disclosed up front in the Evidence Agent's docstring and this file.

## Mobile — `D:\UCIPS\mobile\` (Expo SDK 57, TypeScript, React Navigation, plain Expo Go — no dev client needed)

Built module-by-module like the backend was, each milestone verified live on a physical Android phone (connected via USB debugging + `adb reverse`, no shared wifi needed) before moving to the next.

- [x] **Milestone A**: scaffold (`blank-typescript` template) + nav/storage/location deps installed + `App.tsx` "Ping Backend" screen → verified live on-device: user ran `npx expo start` themselves, connected via Expo Go, tapped Ping, got a real response from the backend.
- [x] **Milestone B**: Auth (login/register, AsyncStorage session, `/me` revalidation) → verified live on-device: registered a citizen, session persisted across app restart, logout worked.
- [x] **Milestone C**: Citizen text complaint flow (expo-location + submit + list) → verified live on-device: submitted a real text complaint from the phone, AI-extracted category/severity showed up in the list.
- [x] Milestone D: Complaint detail + feedback → verified live on-device: rating + comment submitted successfully.
- [x] Milestone E: Authority screens (hotspots/projects/budget optimizer) → verified live on-device: hotspots, ranked projects, and budget optimizer all confirmed working by user.
- [x] **Milestone F**: Image + voice complaint capture → verified live on-device: all three submission modes (text/voice/photo) confirmed working end-to-end against the real backend (Sarvam STT + Gemini vision/extraction). `expo-audio` recording does work in Expo Go on SDK 57, contrary to the pre-build community reports that made this a flagged risk.

**Dev loop**: `cd mobile && npm run dev:android` runs both `adb reverse` calls then starts Metro. Backend must be running separately (`cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8010`).

## Premium frontend rebuild (Modules U0–U6)

The "function over polish" constraint was lifted — the app was rebuilt with a real design system, light+colorful premium styling, bottom tab navigation and full motion polish. Still runs in **plain Expo Go** (no dev client): every library was checked against the SDK 57 docs for Expo Go support first.

- [x] **U0 Foundation** — `src/theme/` (colors + per-category color identity, Plus Jakarta Sans typography, spacing/radii/colored shadows, motion tokens), font loading via `useFonts`, animated `BrandSplash`, safe `haptics` wrapper.
- [x] **U1 UI primitives** — `src/components/ui/`: Text, Screen, Card, Button (gradient + spring press), Input (animated floating label), Chip/Category/Severity/Status, Skeleton shimmer, AnimatedNumber (count-up), ScoreBar, SegmentedControl, EmptyState, Toast provider, StatCard.
- [x] **U2 Navigation** — custom animated bottom tab bar (`navigation/components/TabBar.tsx`), CitizenTabs (Home/Report/Nearby/Profile) + AuthorityTabs (Hotspots/Projects/Budget/Profile), tabs nested inside native stacks so detail screens push full-screen over the bar. **`AuthorityMenuScreen` deleted.**
- [x] **U3 Auth** — gradient brand header, staggered entrance, animated role selector cards.
- [x] **U4 Citizen** — Home (greeting + stat tiles + skeletons + staggered cards), Report (segmented mode switcher, pulsing record button with live timer, photo preview, AI-analysis success state), ComplaintDetail (category-tinted hero, animated star rating), Nearby.
- [x] **U5 Authority** — Hotspots (rank + animated demand bars), Projects (rank badges, 4 animated sub-score bars, expandable "Why this ranking?" AI explanation), BudgetOptimizer (preset chips, gradient result card, count-up impact, utilisation bar, funded/not-funded split, approve flow).
- [x] **U6 Profile + polish** — new `ProfileScreen` (gradient identity card, role badge, logout confirm); global audit: all async paths have skeletons, all errors go through the Toast provider, haptics consistent, no raw colors bypassing the theme.

### Frontend notes
- **Design system is import-based, not a React context** — there's a single fixed light theme, so a `ThemeProvider`/`useTheme` (as originally planned) would have been pure indirection. Import tokens directly from `src/theme`.
- **No `babel.config.js` in the project** — Reanimated's babel plugin is auto-configured by `babel-preset-expo`. If a "Reanimated plugin not configured" error ever appears, that assumption broke and a `babel.config.js` with `babel-preset-expo` needs adding.
- **Expo Go can't show a real native splash** (since SDK 52 it shows the Expo Go icon), so `BrandSplash` is an in-app component covering font-load + session-restore. That's the launch experience in dev/demo.
- **`expo-blur` deliberately unused** — on Android it now needs `BlurTargetView` ref-threading for marginal gain on a light theme; layered translucent surfaces + gradients are used instead.
- Reanimated 4 caveat: prefer flat transform props over the deprecated tuple form in layout-animation initial values.

## Follow-up question loop closed (was a real gap, flagged by user testing)

The AI follow-up question was being shown but had no way to answer it — a dead end, not actually interactive. Fixed:
- **Backend**: `POST /api/complaints/{id}/followup` (`{question, answer}`) folds the citizen's answer back into the original report text and re-runs `extract_complaint`, updating category/description/severity, then re-triggers clustering/evidence/project regen via the existing `_finalize_complaint` path. Capped at one round by design (matches the THIN-REAL "single follow-up round" tag from the original plan) — always returns `follow_up_question: null`. `question` is passed back by the client since it was never persisted server-side.
- Verified live: "mosquitoes near my house" → follow-up asked about stagnant water → answering it correctly reclassified `waste_management` → `drainage`, bumped severity 2→4, and the complaint got clustered — genuine re-reasoning, not cosmetic.
- **Mobile**: `NewComplaintScreen`'s success state now shows an inline answer input + Submit/Skip when a follow-up is pending, and displays a "Report refined" confirmation after — the AI Analysis card above updates live since it's bound to the same `result` state.

### Mobile gotchas
- Phone connects over **wifi** (LAN IP), not purely via USB — Expo CLI auto-detects this. `adb reverse tcp:8010 tcp:8010` (backend) is still required regardless, since the app's own `fetch()` calls run on-device and need `localhost:8010` forwarded to the dev machine. `adb reverse` mappings reset whenever the USB session drops (sleep, cable unplug, `adb` restart) — re-run `npm run reverse` (or `npm run dev:android`) if requests suddenly can't reach the backend.
- **React Native's FormData is broken for file uploads on this RN version (0.86, new architecture)** — `formData.append('file', {uri, name, type})` + `fetch()` throws `Error: Unsupported FormDataPart implementation` on Android. This is a known, still-unresolved new-architecture regression, not a mistake in our code. Fixed by switching to `expo-file-system`'s native `File.upload()` (`uploadType: MULTIPART`) instead of fetch+FormData for voice/image uploads — see `uploadFile()` in `mobile/src/api/client.ts`. If any future upload feature is added, use `uploadFile()`, not `request()` with a `FormData` body.
- The API client (`mobile/src/api/client.ts`) logs every request/response/error to the console (`[api] -> `, `[api] <- `, `[api] xx `) — check the terminal running Metro for this when debugging, since errors surface there before/instead of anywhere else.
