# Project Status Report — AI-Powered Smart Job Portal (CareerBridge)

**Date:** 2026-10-24
**Scope:** the "Part C" product build-out campaign — this session completed Phases 5, 9, 10, 11 and 12-lite.
**Repo state:** single commit `83d106a` on `main`; 53 files carry uncommitted campaign changes (nothing committed or pushed, per the locked decision).
**Update 2026-10-26:** the v2+ campaign is complete and verified LIVE — NVIDIA → Groq migration with the §9 three-key round-robin pool, login/register redesign, and the personalized greeting. Final numbers: gate **68/68 ×2**, smoke **8/8**, walk **82/82 against real Groq calls**, keypool unit test **11/11**, browser #6/#7 PASS at 1280/390, console clean. One deviation recorded (finding PD.6): this Groq account's catalog does not serve the report's llama/mixtral model IDs, so the chain runs `openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → `allam-2-7b` (each verified live with `json_object`). Full state in `PROGRESS.md` (Part D); remaining owner item: rotate the exposed NVIDIA key (PC.8). This v1 report stays as the historical Part C record.

---

## 1. Executive summary

| Area | Status |
|------|--------|
| Regression gate (`scripts/regression.sh`) | **65/65 PASS, exit 0 — run twice back-to-back, plus a third final run** |
| Full API walkthrough (`backend/scripts/e2e_walk.sh`) | **82/82 PASS, exit 0** (includes live AI calls) |
| Contract smoke (`backend/scripts/smoke.mjs`) | 8/8 PASS (runs inside the gate) |
| Frontend lint | exit 0 — 0 errors, 51 pre-existing warnings (budget 200) |
| Frontend build | exit 0 (`vite build`) |
| Browser E2E | **15/15 PASS** — 10 checks at 1280 px, 5 checks at 390 px, console clean at both |
| AI provider (NVIDIA NIM) | Working via new fast-primary + fallback chain; two robustness fixes landed (see §5) |
| Services now | backend `node server.js` on :4000 (background), Vite on :5173, local mongod on :27017 |

**Net new user-facing capability this session:** job seekers get a Save/Jobs bookmark, an application-deadline countdown, on-demand Skill Gap and Interview Prep AI panels on every job page; everyone gets a notifications bell with unread badge and mark-all-read; employers get an optional deadline field when posting. All AI routes (resume analysis, job match, skill gap, interview questions) answer 200 in the e2e walk.

---

## 2. What was delivered per phase

### Phase 5 — AI fallback chain + interview routes — DONE-VERIFIED
- `backend/services/aiService.js` already had `modelChain()` (primary + `NVIDIA_MODEL_FALLBACKS`) from an earlier session, but it was **unconfigured and untested against the live provider**.
- Diagnosed live NVIDIA behavior: the configured primary (`meta/llama-3.2-11b-vision-instruct`) intermittently took >180 s (3× timeout → 502 during the first walk); fallback candidates `llama-3.1-8b-instruct` (410 Gone) and others (404) were unusable; the account is **burst rate-limited** (429 at rapid call #3, 200 again seconds later).
- Configured `backend/.env`: `NVIDIA_MODEL=minimaxai/minimax-m3.1-flash` (verified strict-JSON quality before switching, ~1–3 s answers) with `NVIDIA_MODEL_FALLBACKS=meta/llama-3.2-11b-vision-instruct,meta/llama-3.2-90b-vision-instruct`; both documented in `backend/.env.example` and README.
- `POST /ai/interview-questions` route existed but had zero contract coverage; walk assertions **E9 (200), E10 (`questions` array present), E11 (each question has `type`)** appended.

### Phase 6–8 (earlier sessions) — DONE-VERIFIED
Saved-jobs + notifications + deadline filtering on the backend, page-level code splitting, and the landing-page redesign remain in place with `(Part C Phase 6/7)` code markers and gate coverage. (F17 — "interview questions promised but missing" — is now fully resolved; see Phase 9.)

### Phase 9 — Product pages — DONE-VERIFIED
- `frontend/src/components/Job/JobDetails.jsx`: **Save Job ⇄ Saved** toggle (server is source of truth via `GET /job/saved`, survives reload), **application-deadline row** with formatted date + amber "Closes in N days" (row hidden when the job has no deadline), and two on-demand AI panels in the seeker sidebar:
  - **Skill Gap** → `POST /ai/skill-gap` → "You Already Have" chips + "Gaps to Close" list with per-skill `whyItMatters` reasons + Re-analyze.
  - **Interview Prep** → `POST /ai/interview-questions` → 6 numbered questions with type badges (technical / behavioral / role-specific), per-question tips, Regenerate.
  - Both guard on `user.resumeText` with a toast, show inline errors on failure, and were exercised live in the browser.
- `frontend/src/components/Layout/Navbar.jsx`: **notifications bell** with unread badge ("9+" capped), dropdown of the latest 50 with read/unread styling and relative timestamps, **Mark all as read** → `PUT /notifications/read-all`. Rendered in both the desktop menu and the mobile top row.
- `frontend/src/components/Job/PostJob.jsx`: optional **Application Deadline** date input (`min` = today) with helper text; submits end-of-day-local ISO (`new Date(deadline + "T23:59:59").toISOString()`). Verified end-to-end through the real form: server stored `2026-11-15T18:29:59.000Z` = `23:59:59 GMT+05` local.

### Phase 10 — Gate upgrades — DONE-VERIFIED
- `scripts/regression.sh`: appended **C10.1–C10.15** (append-only per repo contract): model-chain presence + env docs, interview-route registration + 401 contract, panel/save/deadline/bell wiring greps, save + notifications 401 contracts, `/api/v1/notifications` mount tie-in, deadline filter in `getAllJobs`. Gate now totals **65 checks**.
- Gate mandated "green twice": **65/65 ×2, exit 0**, plus a third identical final run.
- `backend/services/aiService.js` robustness fixes that made the AI section deterministic (§5).

### Phase 11 — Browser E2E — DONE-VERIFIED (evidence in §4)
Two full documented passes at 1280 px and 390 px, all checks PASS, console clean at both viewports.

### Phase 12 lite — Docs & final lock — DONE
- `README.md`: new feature bullets (Skill Gap & Interview Prep panels, Saved Jobs, Application Deadlines, Notifications), full `NVIDIA_MODEL` / `NVIDIA_MODEL_FALLBACKS` semantics (429 backoff behavior included), a **Production settings** section (NODE_ENV=production, CORS origins via `FRONTEND_URL`, `/api/v1/health` probe, rate-limit numbers, secrets policy), and the e2e walk added to the Checks block.
- `PROGRESS.md`: Part C section appended — status board, regression log, findings PC.1–PC.8; header updated.
- This report: `REPORT.md`.

---

## 3. Verification numbers (this session)

| When | What | Result |
|------|------|--------|
| pre-Phase-10 | gate after Phase 9 code landed | 50/50 PASS, exit 0 |
| pre-Phase-10 | e2e walk after model-chain config | 79/79 PASS, exit 0 |
| pre-Phase-10 | fixture script (`/tmp/p9_fixture.sh`) — deadline job, notification, save contracts, interview-questions | 26/26 PASS, exit 0 |
| Phase 10 | gate with C10.x appended ×2 | **65/65 PASS, exit 0 — twice** |
| Phase 10 | e2e walk with E9–E11 | **82/82 PASS, exit 0** (the analyze-resume parse-retry fired once *inside* this run and E1 still passed) |
| Phase 12 | final gate run | 65/65 PASS, exit 0 |
| every gate run | `npm run lint` + `npm run build` inside C9.4/C5.7 | PASS |

---

## 4. Browser E2E evidence (Phase 11)

### 1280 × 800 — 10/10 PASS
| # | Check | Result |
|---|-------|--------|
| 1 | Home: hero, authorized nav, 6 job cards, bell present | PASS |
| 2 | Bell: "(1 unread)" → dropdown with the status-change notification → Mark all as read → label becomes "Notifications", zero unread dots, panel stays open | PASS |
| 3 | Logout → login as Job Seeker → nav shows MY APPLICATIONS + DASHBOARD | PASS |
| 4 | Job list: 6 unique job links with titles (incl. the UI-posted smoke job) | PASS |
| 5 | Job detail: deadline row "29/10/2026 Closes in 5 days", Save button restored to "Saved" from the server, "Already Applied", match ring + "Good Match", all three sidebar panels | PASS |
| 6 | Analyze Skill Gap → results (4 have-chips, Re-analyze, no error) | PASS |
| 7 | Generate Interview Questions → exactly 6 questions (4 technical, 1 behavioral, 1 role-specific), 6 tips, Regenerate | PASS |
| 8 | Save toggle round-trip: Saved → Save Job → Saved | PASS |
| 9 | Employer: `/job/post` date input present, min=today, helper hint | PASS |
| 10 | Console: 0 errors | PASS |

### 390 × 844 — 5/5 PASS
| # | Check | Result |
|---|-------|--------|
| 11 | Top bar: hamburger + bell + theme toggle visible, desktop links hidden | PASS |
| 12 | Hamburger menu opens (7 links) → ALL JOBS navigates → menu closes | PASS |
| 13 | Job detail: **no horizontal overflow**, sidebar stacked below main content, entrance animation completes (`opacity: 1`, `transform: none`) | PASS |
| 14 | Seeker mobile: Save + Apply + 3 panels + deadline countdown | PASS |
| 15 | Console: 0 errors | PASS |

---

## 5. Findings & fixes (Part C findings log PC.1–PC.8)

| ID | Status | Summary |
|----|--------|---------|
| PC.1 | **fixed** | Appending walk checks E9–E11 accidentally fused the E7 and E8 script lines into one command; curl sent body `{}req`, producing the Express "Unexpected non-whitespace character after JSON at position 2" 400 and a final `%{http_code}` of 000. Lines split, `bash -n` clean. |
| PC.2 | **fixed** | AI 502s traced to an ultra-slow primary model + unset fallbacks. Fast verified primary + two vision fallbacks configured; all four AI routes now 200 in the walk. |
| PC.3 | **fixed** | NVIDIA 429s are bursty (measured: rejected at call #3, OK at call #4 seconds later). `requestChat` now waits 8 s and retries the **same model once** on 429 before advancing the chain — keeps the app on the fast primary and never reaches the 160 s vision fallback. |
| PC.4 | **fixed** | `analyze-resume` returned malformed JSON ≈16 % of calls: content **cut mid-string at ~1257 chars** while complete answers run 1335–1475 chars and `finish=stop` — so not a token cap, an occasional provider-side cut. `analyzeResume` now retries once on parse failure; exact gate-C8.4 messages kept for the final throw. Head+tail logging added to parse errors for future diagnosis. |
| PC.5 | **fixed** | Real UI bug: the bell renders twice (desktop + mobile) and a single `ref` pointed at only one instance, so mousedown inside the desktop panel counted as an "outside" click — Mark-all was dead. Now uses `closest('[data-notif-bell]')`. |
| PC.6 | environment, not product | The first browser tab wedged: `requestAnimationFrame` stopped firing while `document.visibilityState` reported `visible` (entrance animations frozen at `opacity: 0` / `translateX(±40)`, which also fake-caused a 414 px overflow). A fresh tab rendered and animated normally; all evidence re-collected there. Same renderer flake family as the earlier IO-wedge / scroll-timeout incidents. |
| PC.7 | info | Job schema validation still active: `location ≥ 20 chars`, `title ≤ 30 chars`, `description ≥ 30` — test fixtures must respect these. |
| PC.8 | **action recommended** | A diagnostic `node -e` script once echoed the NVIDIA API key into a terminal stack trace (tool output only — it is in **no tracked file**). Consider rotating `NVIDIA_API_KEY` in `backend/.env`. |

---

## 6. Open items (unchanged unless noted)

1. **0.10 — bcrypt hash in auth responses** *(needs owner decision)*: `POST /user/register` and `POST /user/login` return the whole user document including the password hash. Frozen contract, untouched. One word and it gets stripped + gate-asserted.
2. **Atlas return** *(needs owner action)*: `backend/.env` still points at local mongod; restore `backend/.env.atlas-backup` when the Atlas hostname is corrected, then restart.
3. **O2**: dark-mode classes for `Application.jsx`. **O3**: move `Context` out of `main.jsx` (~20 imports).
4. `backend/test_apply.js` / `test_apply2.js` stay broken and untouched (F18). Test users accumulate in the local DB (no delete-user endpoint) — smoke leaves 2 per run, the walk leaves 4 per run.
5. Build chunk warning: `charts` chunk ≈ 529 kB (>500 kB) — pre-existing, untouched.
6. `npm audit`: known vulnerabilities (backend 23 / frontend 16) — untouched per the no-dependency-change decision.

---

## 7. How to run / reproduce everything

```sh
# services (as currently running)
mongod --dbpath /tmp/jobportal-mongo --port 27017 --bind_ip 127.0.0.1
cd backend && node server.js                 # :4000
cd frontend && npm run dev                   # :5173, strictPort

# verification stack
bash scripts/regression.sh                   # gate: 65 checks (expect 65/65)
node backend/scripts/smoke.mjs               # fast contract spot-checks (8)
bash backend/scripts/e2e_walk.sh             # full walk incl. live AI (expect 82/82)
cd frontend && npm run lint && npm run build # 0 errors / exit 0
```

Seeded demo accounts used for the browser pass (local DB only): `p9_employer_1792821362@example.com` / `p9_seeker_1792821362@example.com`, password `Password123!`.

---

*Generated 2026-10-24. Detailed phase log and findings also live in `PROGRESS.md` (Part C section).*
