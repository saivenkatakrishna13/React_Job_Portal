# AI-Powered Smart Job Portal

A premium AI-driven recruitment platform built on the MERN stack (MongoDB, Express.js, React.js, Node.js). This application connects job seekers with employers using advanced AI features powered by Groq — a 3-key round-robin pool with automatic failover behind a primary `openai/gpt-oss-120b` model and two fallbacks — for resume analysis, job matching, skill gap identification, and interview preparation.


## Features

- **AI Resume Analysis:** Extract and evaluate candidates' resumes (PDF) to determine skills, experience, and assign an AI match score.
- **Smart Job Matching:** Automatically rank open jobs against a candidate's profile and recommend the best fit.
- **Skill Gap & Interview Prep:** Identify missing skills for a desired role and automatically generate tailored interview questions (technical, behavioral, and role-specific) — both available as on-demand panels on every job page for signed-in seekers with a resume.
- **Saved Jobs:** Bookmark any job with one click; saved state persists across sessions (`Save Job` ⇄ `Saved` on the job page).
- **Application Deadlines:** Employers can set an optional closing date when posting a job; past-deadline jobs disappear from search automatically, and job pages show "Closes in N days" while open.
- **Notifications:** A navbar bell with an unread badge notifies seekers of application-status changes and employers of new applicants; open it to read the latest 50 and mark all as read.
- **Personalized Greeting:** a one-time, time-aware welcome banner right after login carrying a real role-aware number — matching jobs for seekers, unchecked applicants for employers.
- **Redesigned Sign-in:** split-screen login/register with floating-label inputs, inline validation, a segmented role picker, a friendly bad-credentials message, and a password strength meter on register.
- **Recruiter Analytics Dashboard:** View comprehensive analytics, application status trends, and candidates sorted by AI match scores.
- **Candidate Tracking System (ATS):** A robust lifecycle tracking system (Applied → Under Review → Shortlisted → Interview → Selected/Rejected) with an animated status timeline.
- **Responsive Design:** A premium, modern SaaS aesthetic, accessible seamlessly across desktop and mobile devices.

## Technologies Used

- **Frontend:** React.js 18, Vite, React Router v6, Tailwind CSS / Design System, Axios
- **Backend:** Node.js, Express.js, MongoDB (Mongoose)
- **AI Integration:** Groq (OpenAI-compatible API; 3 keys round-robin with 429/auth failover, `openai/gpt-oss-120b` primary + `qwen/qwen3.8-27b` and `allam-2-7b` fallbacks, provider-native JSON mode) with a built-in mock mode for keyless development
- **Authentication:** JWT (JSON Web Tokens), Bcrypt (Cookie-based session)
- **File Upload:** Cloudinary (supports PDF text extraction)

## Getting Started

### Prerequisites

- Node.js (v18 or above; the app is developed and verified on Node 22)
- MongoDB Atlas account (or local MongoDB server). **Atlas Network Access must allow your machine's public IP**, and the `MONGO_URI` host must resolve — if the backend logs `querySrv ENOTFOUND`, the cluster hostname in `backend/.env` is stale or wrong.
- Cloudinary account for file storage. If resume **PDF** links open as 401, enable PDF/ZIP delivery in the Cloudinary console security settings.
- Three Groq API keys for AI features (optional — without them the backend runs in AI mock mode)

### Installation

1. Install NPM packages for both backend and frontend:

   ```sh
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. Set up environment variables:

   - In the `backend` directory, create a `.env` file based on `.env.example`:

   ```env
   PORT=4000
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   FRONTEND_URL=http://localhost:5173
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_jwt_secret
   JWT_EXPIRE=7d
   COOKIE_EXPIRE=7
   NODE_ENV=development
   GROQ_API_KEY_1=your_groq_api_key_1
   GROQ_API_KEY_2=your_groq_api_key_2
   GROQ_API_KEY_3=your_groq_api_key_3
   # Optional model tuning — see "Environment variables" below
   GROQ_MODEL=openai/gpt-oss-120b
   GROQ_MODEL_FALLBACKS=qwen/qwen3.8-27b,allam-2-7b
   # AI_MOCK_MODE=true forces canned answers; unset = live when a key is set, mock otherwise
   ```

   - In the `frontend` directory, create a `.env` file based on `.env.example`:

   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   ```

3. Run the backend server (port **4000**):

   ```sh
   cd backend
   npm run dev      # nodemon, reloads on change
   # or: npm start  # plain node server.js
   ```

   `backend/app.js` loads `backend/.env` relative to its own file location, so the backend can also be started from the project root with `node backend/server.js`. Startup prints a warning listing the **names** of any missing environment variables (never their values).

4. Run the frontend application (port **5173**, pinned with `strictPort`):

   ```sh
   cd frontend
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173` to view the app.

### Environment variables

- `backend/.env`: see `.env.example`.
  - `GROQ_API_KEY_1/2/3` — three independent keys in a round-robin pool: requests pick the least-recently-used healthy key (load spreads across all three), a `429` cools only the offending key for exactly as long as Groq's `Retry-After` / `x-ratelimit-reset-requests` header says and immediately retries the same model on the next key, an auth error (`401`/`403`) disables that key for good, and only when **all three** are cooling does the model chain advance (after the soonest cooldown). Keep them as three distinct vars so one key can be rotated individually. With all of them unset, every AI route answers from mock data — canned-but-realistic JSON computed from the real request inputs — so the whole app runs keyless.
  - `AI_MOCK_MODE` is **optional** — `true` forces mock answers even with keys set; `false` forces live calls (at least one key then required); unset = live when a key is set, mock otherwise.
  - `GROQ_MODEL` is **optional** — it overrides the built-in default model used for all AI calls (resume analysis, job match, skill gap, interview questions). Default `openai/gpt-oss-120b`.
  - `GROQ_MODEL_FALLBACKS` is **optional** — a comma-separated ordered list tried when the primary model is gone (404/410), errors (5xx), or rate-limited past one short backoff. Default `qwen/qwen3.8-27b,allam-2-7b`. Note: the classic `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` / `mixtral-8x7b-32768` IDs were **not served** by this account's catalog on 2026-10-26 (404/400), so the defaults are models verified live with `response_format: json_object`.
  - `FRONTEND_URL` may hold several comma-separated origins (CORS allow-list).
- `frontend/.env`: `VITE_API_URL=http://localhost:4000/api/v1`.

### Production settings

- Run the backend with `NODE_ENV=production` (combined access log format, no dev verbosity).
- Set `FRONTEND_URL` to the exact deployed frontend origin(s) — CORS only answers listed origins with credentials.
- Readiness/load-balancer probe: `GET /api/v1/health` → `200 {"status":"ok","db":"connected"}` while MongoDB is up, `503` otherwise.
- Rate limits (per IP, 15-minute sliding window): register 60, login 30, `/api/v1/ai` 30 — deliberately above the test-suite budgets.
- Secrets stay in `backend/.env` (git-ignored); startup logs only the **names** of missing variables, never values.

### Checks

```sh
bash scripts/regression.sh          # API + config regression gate (backend must be running)
node backend/scripts/smoke.mjs      # fast contract spot-checks
bash backend/scripts/e2e_walk.sh    # full E2E API walkthrough as 4 real users (82 checks; hits the AI routes — live or mock per AI_MOCK_MODE)
RESUME_PDF=/path/to/resume.pdf node backend/scripts/smoke.mjs   # also covers the resume/AI flow
cd frontend && npm run lint         # eslint
```
