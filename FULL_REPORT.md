# FULL REPORT — React Job Portal (CareerBridge): Frontend → Backend
Last updated: 2026-10-23 · Repo: `react-job-portal-main` · Branch `main` · 1 commit (`83d106a Initial commit`), all work below is **uncommitted** (locked rule: no commits/pushes without asking).

Purpose: standalone context for another AI/engineer. Everything here was verified against the actual code and live services; secrets are listed by **name only**, never by value.

---

## 1. What this is

A MERN job portal ("CareerBridge") with two roles — **Employer** and **Job Seeker** — plus AI resume analysis on NVIDIA NIM. Frontend is Vite/React on :5173, backend is Express on :4000, DB is MongoDB (database name `Job_Portal`), file storage is Cloudinary.

```
Browser (React SPA, :5173)
   │  axios withCredentials → VITE_API_URL (http://localhost:4000/api/v1)
   ▼
Express (app.js → routes → controllers → middlewares)
   │                │                 │
   ▼                ▼                 ▼
MongoDB         Cloudinary        NVIDIA NIM
(mongoose)      (resume files)    (aiService.js, chat/completions)
```

### How to run
```bash
# 1. Database (local; see §7 Atlas note)
mongod --dbpath /tmp/jobportal-mongo --port 27017 --bind_ip 127.0.0.1
# 2. Backend — run from the PROJECT ROOT (file-based dotenv resolves backend/.env)
node backend/server.js          # :4000, expects MongoDB Connected log
# 3. Frontend
cd frontend && npm run dev      # :5173, strictPort pinned
# Verification suites (backend must be up):
bash scripts/regression.sh      # 50-check gate (note: restarts the backend; restart it after)
node backend/scripts/smoke.mjs  # 8 fast contract checks
bash backend/scripts/e2e_walk.sh # 79-check full API walkthrough
```

---

## 2. Backend

**Stack:** Express 4 (ESM, `"type":"module"`), Mongoose 8, bcrypt, jsonwebtoken, cookie-parser, cors (credentials, origin list from FRONTEND_URL), express-fileupload (5 MB limit, temp files), pdf-parse, cloudinary, axios (AI calls), validator, dotenv.

**Entry:** `backend/server.js` (cloudinary config + env-name warnings + listen on `PORT||4000`) → `backend/app.js` (config dotenv from `path.resolve(__dirname, ".env")` with `override: true`, middleware chain, routers, `dbConnection()` last, `errorMiddleware` final).

**Env vars in `backend/.env` (names only):** `MONGO_URI`, `JWT_SECRET_KEY`, `JWT_EXPIRE`, `COOKIE_EXPIRE`, `FRONTEND_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NVIDIA_API_KEY`, `NODE_ENV`, `PORT` (optional). Optional AI overrides read at **call time**: `NVIDIA_BASE_URL`, `NVIDIA_MODEL` (default `meta/llama-3.2-11b-vision-instruct`).
**Frontend env:** `VITE_API_URL` (plain KEY=value form; `.env.example` mirrors it).

### Middleware
| File | Behavior |
|---|---|
| `middlewares/auth.js` (`isAuthenticated`) | reads `token` cookie → verifies JWT → loads `req.user`; **null-user guard** `if (!req.user)` → 401 "User Not Authorized" |
| `middlewares/error.js` | `ErrorHandler(message, code)` class + `errorMiddleware`: string/obj normalization, `CastError`→400, dup key 11000→400, `ValidationError`→400 (field messages joined), JWT invalid/expired→401; response always `{success:false, message}` |
| `catchAsyncError.js` | async route wrapper → next(err) |
| CORS | origin list from `FRONTEND_URL` (comma-splittable), methods GET/POST/DELETE/PUT, credentials true |

### Data models
**User** (`userSchema.js`): name (3–30), email (validator), phone (Number), password (8–32, `select:false`, **bcrypt hash in `pre('save')` when modified**), role enum `["Job Seeker","Employer"]`, `createdAt` (default now), `resumeText` (String), `resumeAnalysis` (Object), `resume {public_id,url}`. Methods: `comparePassword`, `getJWTToken` (JWT payload `{id}`, signed with JWT_SECRET_KEY, expires per JWT_EXPIRE).

**Job** (`jobSchema.js`): title (3–30), description (30–500), category, country, city, location (min 20 chars), `fixedSalary` **or** `salaryFrom`/`salaryTo` (4–9 digits), `expired` (default false), `jobPostedOn` (default now), `postedBy` (ObjectId→User, required), `requiredSkills` ([String], default []), `jobType` enum `[Full-time, Part-time, Contract, Internship, Remote]` default Full-time, `experienceLevel` enum `[Entry, Mid, Senior, Lead]` default Entry.

**Application** (`applicationSchema.js`, `timestamps:true`): name (3–30), email, coverLetter (required), phone, address, `resume {public_id,url}` (both required), `applicantID {user, role:"Job Seeker"}`, `employerID {user, role:"Employer"}`, `jobId` (ObjectId→Job), `status` enum `[Applied, Under Review, Shortlisted, Interview, Selected, Rejected]` default Applied, `statusHistory [{status, changedAt, changedBy}]`, `aiMatchScore`, `matchingSkills[]`, `missingSkills[]`, `aiExplanation`.

### API — all 20 routes (prefix `/api/v1`)

**User (`routes/userRoutes.js`)**
| # | Method & path | Auth/Role | Request | Success | Key errors |
|---|---|---|---|---|---|
| 1 | POST `/user/register` | — | `{name,email,phone,password,role}` | **201** `{success,user,token,message}` + cookie | 400 empty "Please fill full form !", dup "Email already registered !", validation msgs |
| 2 | POST `/user/login` | — | `{email,password,role}` | **201** same shape + cookie | 400 missing fields / "Invalid Email Or Password."; 404 role mismatch |
| 3 | GET `/user/logout` | — | cookie | **201** clears cookie | — |
| 4 | GET `/user/getuser` | cookie | — | 200 `{user}` sanitized: `_id,name,email,phone,role,resumeText,resumeAnalysis` (no hash) | 401 |
| 5 | POST `/user/upload-resume` | cookie | multipart field `resume`, PDF only | 200 "Resume uploaded successfully!" (Cloudinary upload → pdf-parse → sets resumeText/resume.resume, resets resumeAnalysis) | 400 no file / non-PDF / "Could not read text from this PDF…"; 500 "Failed to upload Resume to Cloudinary. Please check configuration." |

**Job (`routes/jobRoutes.js`)**
| # | Method & path | Auth/Role | Notes |
|---|---|---|---|
| 6 | GET `/job/getall` | public | queries: `search,category,location,jobType,experienceLevel,salaryMin,salaryMax,skills,page,limit` — all regex input passes through `escapeRegex` (so `search=(` is safe); salary filter lives in its own `$and` clause; returns `{success,jobs,totalJobs,totalPages,currentPage}` |
| 7 | POST `/job/post` | Employer | required title/description/category/country/city/location; salary must be fixed **or** range, not both → **200** `{job}`; 400 for seekers/missing |
| 8 | GET `/job/getmyjobs` | Employer | 200 `{myJobs}`; 400 for seekers |
| 9 | PUT `/job/update/:id` | Employer **owner** | allow-listed fields only (never postedBy/_id/jobPostedOn) → 200; **403** non-owner; 404 missing |
| 10 | DELETE `/job/delete/:id` | Employer owner | 200 / 403 / 404 |
| 11 | GET `/job/:id` | cookie | 200 `{job}` / 404 ("Invalid ID / CastError" also 404) |

**Application (`routes/applicationRoutes.js`)**
| # | Method & path | Auth/Role | Notes |
|---|---|---|---|
| 12 | POST `/application/post` | Job Seeker | body `{jobId, name?, email?, phone?, coverLetter?, address?}` (falls back to profile; 1-click apply) **or** multipart with `resume` file (PNG/JPEG/WEBP/PDF) → 200 `{application}`. Without file: needs profile resume else 400. Errors: 400 employer/duplicate/no-resume/expired job; 404 unknown job. Best-effort AI scoring after create (needs resumeText + resumeAnalysis; AI failure never fails the application) |
| 13 | GET `/application/employer/getall` | Employer | own jobs' applications, populated `jobId (title,category,location)`, sort `createdAt:-1` |
| 14 | GET `/application/jobseeker/getall` | Job Seeker | own applications, same shape |
| 15 | DELETE `/application/delete/:id` | Job Seeker owner | 200 / 403 (not yours) / 404 / 400 for employers |
| 16 | PUT `/application/status/:id` | Employer owner | `{status}` must be in enum (message lists allowed values); pushes to statusHistory → 200; 400 role/missing/invalid, 403 non-owner |

**AI (`routes/aiRoutes.js`, all cookie-auth)**
| # | Method & path | Request | Success | Errors |
|---|---|---|---|---|
| 17 | POST `/ai/analyze-resume` | `{}` | 200 `{analysis}` (computes+caches `user.resumeAnalysis` if absent; includes computed `score`) | 400 no resumeText; **502** "AI service is unavailable right now. Please try again."; "AI returned malformed JSON. Please try again." |
| 18 | POST `/ai/match-job` | `{jobId}` | 200 `{matchData}` (AI skills + `matchScore` computed locally via `calculateJobMatchScore`) | 400 no jobId; 404 job; "AI returned malformed JSON for job match."; 502 |
| 19 | POST `/ai/skill-gap` | `{jobId}` | 200 `{skillGapData}` | 400 / 404; "AI returned malformed JSON for skill gap."; 502 |

**Analytics (`routes/analyticsRoutes.js`)**
| # | Method & path | Auth | Success |
|---|---|---|---|
| 20 | GET `/analytics/employer` | Employer | 200 `{analytics:{totalJobs,totalApplications,statusCounts{Applied..Rejected},avgMatchScore}}`; 400 for seekers; 401 unauth |

### aiService.js (NVIDIA NIM)
- Reads `NVIDIA_BASE_URL`/`NVIDIA_MODEL` **at call time** (dotenv-safe when started from root); single `requestChat()` helper: Authorization `Bearer NVIDIA_API_KEY`, `timeout: 180000` (raised from 60000 on 2026-10-23 — cold inference measured at 60.4s vs 0.7–1.7s warm; provider failures map to clean 502 with the frozen message).
- Prompts demand bare-JSON responses; `cleanJson()` strips code fences and extracts the first `{…}` block; parse failures throw the per-endpoint "malformed JSON" messages (these are NOT remapped to 502).
- `calculateResumeScore` / `calculateJobMatchScore` are deterministic local fallbacks layered on top of AI output (resume score formula weighs experience/skills/projects/education; job-match penalizes for experience-level gaps and student candidates).
- Provider facts (2026-10-23): default model works but cold-starts 60s+; `meta/llama-3.1-8b-instruct` and `meta/llama-3.3-70b-instruct` are **410 Gone (EOL 2026-08-26)**; several catalog models 404 for this account; `/v1/models` lists 84 models.

---

## 3. Frontend

**Stack:** React 18 + Vite 5 (plugin-react-swc), react-router-dom 6, axios, Tailwind CSS **v4** (via `@import "tailwindcss"` in `App.css` + `@custom-variant dark` so `<html class="dark">` drives dark mode), framer-motion, recharts, react-hot-toast, react-select, react-icons/lucide-react.
**Scripts:** `dev` (vite), `build` (vite build), `lint` (`eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 200`), `preview`. ESLint: `frontend/.eslintrc.cjs` relaxes `react/prop-types` and `no-unused-vars`; `react/no-unescaped-entities` disabled (ordinary copy like `Don't` in ~20 files).
**API layer:** `src/utils/api.js` — one axios instance `{baseURL: import.meta.env.VITE_API_URL, withCredentials: true}`. No interceptors, no client-side timeout.
**Vite config:** `strictPort: true` pinned to 5173 (C1.3).

### Auth state (this was the login bug area — heavily fixed)
- `src/main.jsx` exports **`Context`** (kept exported — frozen contract C5.3) holding `isAuthorized, user, authLoading` (+ setters), wrapped in `ThemeProvider`, mounted under `React.StrictMode`.
- `src/App.jsx` runs one `fetchUser()` on mount: `GET /user/getuser` → sets user+authorized; catch → not authorized; **`finally` always `setAuthLoading(false)`**.
- `src/components/Layout/ProtectedRoute.jsx`: while `authLoading` renders a spinner instead of redirecting; supports `requiredRole="Job Seeker"|"Employer"` gates.
- Login/Register call `setUser` on success (C5.2) so navbar updates without refresh.
- `MyApplications` waits for `authLoading || !user?.role` before choosing its query (C5.6).

### Routes (`src/App.jsx`)
| Path | Guard | Page |
|---|---|---|
| `/login`, `/register` | public | `Auth/Login`, `Auth/Register` |
| `/` | public | `Home` (HeroSection, HowItWorks, PopularCategories, PopularCompanies) |
| `/job/getall` | protected | `Job/Jobs` (filters, `limit=100`) |
| `/job/:id` | protected | `Job/JobDetails` |
| `/job/post` | Employer | `Job/PostJob` |
| `/job/me` | Employer | `Job/MyJobs` |
| `/application/:id` | Job Seeker | `Application/Application` (apply form) |
| `/applications/me` | protected | `Application/MyApplications` (+ `ResumeModal` overlay) |
| `/candidate/dashboard` | Job Seeker | `Candidate/CandidateDashboard` (`limit=100`, resume upload, AI analysis/score) |
| `/recruiter/dashboard` | Employer | `Recruiter/RecruiterDashboard` (recharts stats from `/analytics/employer`) |
| `*` | public | `NotFound/NotFound` |

`Navbar` (Layout) renders per-role links: HOME, ALL JOBS, APPLICANTS (`/applications/me`), DASHBOARD (role-specific), POST JOB, MY JOBS, dark-mode toggle, LOGOUT. `Footer` + `Toaster` mount outside the routes. Shared presentational components in `src/components/ui/` (Button, Card, Badge, Modal, Input, Skeleton, EmptyState); `src/utils/animations.js` for framer-motion variants.

**ResumeModal** (Step-6 fix): fixed `inset-0 z-50` overlay, `max-h-[85vh]` panel, close button + backdrop-click `onClick={onClose}`, props signature `{imageUrl, onClose}` unchanged (C6.1–C6.4).

---

## 4. Verification status (all rerun 2026-10-23 after services restarted)

| Suite | Result | Notes |
|---|---|---|
| `scripts/regression.sh` (50 checks C0–C9) | **50/50 PASS, exit 0** — ran twice (pre/post AI-timeout fix) | includes frontend build + lint inside; **restart backend after** (C1.1 kills it, known finding 0.7) |
| `node backend/scripts/smoke.mjs` | **8/8 PASS, exit 0** | resume flow SKIPs without `RESUME_PDF` |
| `bash backend/scripts/e2e_walk.sh` | **79/79 PASS, exit 0** (×3 runs, incl. clean fixture auto-gen via macOS `cupsfilter`) | every route exercised as 4 real users; real PDF upload→Cloudinary→pdf-parse→resumeText; 400/401/403/404 role & ownership matrix; full status pipeline with statusHistory; all 3 AI endpoints 200 with real JSON |
| Browser (1280px, localhost:5173) | PASS | register Employer → 201 → `getuser` 200 → `/`; direct `/recruiter/dashboard` renders with name+stats; navbar complete; LOGOUT → 201 → `/login`; re-login → 201 → `getuser` 200 → `/`; console clean except expected logged-out 401 probes |
| Earlier live checks | PASS | Cloudinary `api.ping()` OK; NVIDIA NIM completion 200 |

**Error semantics verified:** validation→400 with field messages, bad/absent auth→401, role violations→400, ownership violations→403, missing/expired resources→404, AI provider outage/cold-timeout→502.

---

## 5. Known issues / open decisions (do not "fix" silently)

| ID | Status | Detail |
|---|---|---|
| 0.1 | **needs owner decision** | `POST /user/register` and `/user/login` return the whole user document → response body includes the **bcrypt hash** (findings id 0.10). Frozen response shape, flagged, not changed. `getuser` IS sanitized. |
| 0.2 | cosmetic | Build warns first chunk 1,000.86 kB (>500 kB budget) |
| 0.3 | info | `npm audit`: backend 23 vulns (3 critical), frontend 16 (1 critical) — untouched by design (no version bumps rule) |
| 0.4 | info | untracked `.DS_Store` files, no `.DS_Store` gitignore rule |
| 0.7 | known limit | regression gate's C1.1 restarts the backend; replacement dies with the gate's shell → restart `node backend/server.js` after each gate run |
| 0.11 | resolved | AI 502 from 60s cold start → timeout now 180000ms in aiService.js |
| 0.12 | resolved | E2E-script-only bugs (empty-id cascade, case grep, logout ordering, swallowed exit) |
| F17 | **needs decision** | README promises "interview questions"; no endpoint exists. `/ai/skill-gap` exists (route #19) but **the UI never calls it**. |
| F18 | by decision | `backend/test_apply.js` / `test_apply2.js` are legacy-broken (CommonJS `require` in ESM; old `/api/v1/...` paths); kept untouched, must keep existing (C9.5) |
| O1 (F22) | open idea | respond to applicants immediately, score in background, skip AI-match call on every job page open |
| O2 / O3 | open ideas | dark-mode classes for `Application.jsx`; move `Context` out of `main.jsx` (touches ~20 imports — C5.3 forbids removing the export) |
| Atlas | broken | `backend/.env` MONGO_URI points at `cluster0.yiqww1o.mongodb.net` which returns **NXDOMAIN**; currently swapped (approved) to `mongodb://127.0.0.1:27017/Job_Portal`; original preserved in **`backend/.env.atlas-backup`** (git-ignored, never print). To return: fix cluster hostname + Network Access IP allowlist, restore that one line, restart backend |
| local DB | ephemeral | `/tmp/jobportal-mongo` resets on reboot |
| test residue | known | each smoke run leaves 2 `smoke_*` users, each e2e run leaves 4 `e2e_*` users (no delete-user endpoint exists) |

---

## 6. Frozen contracts (locked decisions — do not change without the owner)

- **API paths, response shapes, role strings, status enum values, message strings, frontend routes.**
- **`Context` must stay exported from `frontend/src/main.jsx`** (C5.3).
- Ports **4000 / 5173** (`strictPort: true`); DB name **`Job_Portal`**.
- **No new dependencies, no version bumps, no lockfile edits, no `npm audit fix`.**
- **Never print values from `backend/.env`** — "is set?" checks only (the single approved MONGO_URI swap excepted; its new value is credential-free).
- **No commits / pushes** without being asked.
- Regression gate is **append-only**: never delete or weaken a check.

---

## 7. Current repo state (uncommitted)

**Modified (28):** README.md, backend/{.env.example,.gitignore,app.js,server.js,package.json,controllers/{application,job,user}Controller.js,middlewares/{auth,error}.js,models/{application,user}Schema.js,services/aiService.js}, frontend/{.eslintrc.cjs,package.json,vite.config.js,src/App.jsx,src/main.jsx,src/components/{Application/MyApplications,Application/ResumeModal,Auth/Login,Auth/Register,Candidate/CandidateDashboard,Home/Home,Job/Jobs,Layout/ProtectedRoute}.jsx}
**Untracked:** `PROGRESS.md` (full session ledger: status board, findings log, regression log, change ledger), `scripts/regression.sh` (the 50-check gate), `backend/scripts/` (`smoke.mjs`, `e2e_walk.sh`), `.DS_Store` files.

**Change ledger / step-by-step verification history:** see `PROGRESS.md` (last updated 2026-10-23 13:43 IST, "gate 50/50 + E2E 79/79 + smoke 8/8 all PASS").

---

## 8. Highest-value next steps (owner has not approved these)

1. Strip `password` from `sendToken` register/login response (open decision 0.1/0.10).
2. Browser click-through of remaining UI flows: Post Job form → MyJobs edit/delete → seeker Apply form → Applicants list status pipeline → resume modal eye-button.
3. Repair Atlas (hostname + IP allowlist) and restore `MONGO_URI` from the backup; consider a persistent dbpath instead of `/tmp`.
4. Decide on F17 (interview-questions endpoint / wiring `/ai/skill-gap` into the UI) and O1 (background AI scoring).
