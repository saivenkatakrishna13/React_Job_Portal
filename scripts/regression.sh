#!/usr/bin/env bash
# Append-only. Never delete or weaken an existing check.
export API=${API:-http://localhost:4000/api/v1}   # child `bash -c` shells must inherit this
PASS=0; FAIL=0
check() {  # check "ID description" 'shell command that exits 0 on success'
  if bash -c "$2" >/dev/null 2>&1; then echo "PASS  $1"; PASS=$((PASS+1)); else echo "FAIL  $1"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -m 20 -o /dev/null -w "%{http_code}" "$@"; }
# `check` evaluates each assertion in a fresh child shell (`bash -c`), so the
# helper function must be exported too, otherwise every check fails on
# "code: command not found" instead of on the real assertion.
export -f code
# POST helpers (also need exporting: `check` runs assertions in a fresh shell)
export EMPTY_JSON='{}'
export LOGIN_JSON='{"email":"a@b.com"}'
post_code() { curl -s -m 20 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$1" "$2"; }
post_body() { curl -s -m 20 -X POST -H "Content-Type: application/json" -d "$1" "$2"; }
export -f post_code post_body

# ---- Step 0 ----
check "C0.1 backend reachable"  '[ "$(code $API/job/getall)" = "200" ]'
check "C0.2 getuser needs auth" '[ "$(code $API/user/getuser)" = "401" ]'
# ---- Step 1 ----
check "C1.1 root-started backend logs MongoDB Connected" '
  root=$(git rev-parse --show-toplevel) || exit 1
  log=$(mktemp)
  old=$(lsof -nP -iTCP:4000 -sTCP:LISTEN -t 2>/dev/null)
  if [ -n "$old" ]; then kill $old 2>/dev/null; sleep 2; fi
  (cd "$root" && node backend/server.js >"$log" 2>&1 &
   echo $! >"$log.pid")
  rpid=$(cat "$log.pid")
  for i in $(seq 1 15); do
    grep -qE "MongoDB Connected|Failed to connect" "$log" && break
    sleep 1
  done
  ok=0; grep -q "MongoDB Connected" "$log" && ok=1
  kill $rpid 2>/dev/null; sleep 1
  left=$(lsof -nP -iTCP:4000 -sTCP:LISTEN -t 2>/dev/null)
  if [ -n "$left" ]; then kill $left 2>/dev/null; sleep 2; fi
  rm -f "$log" "$log.pid"
  # restore the backend the remaining checks need
  (cd "$root/backend" && nohup node server.js >/dev/null 2>&1 & disown)
  sleep 4
  [ "$ok" -eq 1 ]'
# NOTE: curl returns canonical header case (Access-Control-Allow-Origin), so the
# response is lower-cased before matching. The assertion itself is unchanged:
# both headers, with the exact :5173 origin.
check "C1.2 preflight allowed for FRONTEND_URL" 'h=$(curl -si -m 20 -X OPTIONS $API/user/login -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" | tr -d "\r" | tr "A-Z" "a-z"); printf "%s" "$h" | grep -q "access-control-allow-origin: http://localhost:5173" && printf "%s" "$h" | grep -q "access-control-allow-credentials: true"'
check "C1.3 vite port pinned"  'grep -q strictPort frontend/vite.config.js'
check "C1.4 cors method typo gone" '! grep -qE "^[[:space:]]*method:" backend/app.js'
check "C1.5 dotenv path is file-based" 'grep -q "fileURLToPath(import.meta.url)" backend/app.js'
check "C1.6 missing-env warning is name-only" 'grep -q "missing environment variables (names only)" backend/server.js'
# ---- Step 2 ----
check "C2.1 register with empty body -> 400" '[ "$(post_code "$EMPTY_JSON" $API/user/register)" = "400" ]'
check "C2.2 login missing password/role -> 400" '[ "$(post_code "$LOGIN_JSON" $API/user/login)" = "400" ]'
check "C2.3 garbage token -> 401" '[ "$(code -H "Cookie: token=garbage" $API/user/getuser)" = "401" ]'
check "C2.4 too-short name rejected 400" 'j="{\"name\":\"Al\",\"email\":\"short_name_check_$(date +%s)@example.com\",\"phone\":1234567890,\"password\":\"password123\",\"role\":\"Job Seeker\"}"; [ "$(post_code "$j" $API/user/register)" = "400" ]'
check "C2.5 register still says Please fill full form" 'post_body "$EMPTY_JSON" $API/user/register | grep -q "Please fill full form"'
check "C2.6 auth middleware null-user guard" 'grep -q "if (!req.user)" backend/middlewares/auth.js'
check "C2.7 ValidationError handled by errorMiddleware" 'grep -q "ValidationError" backend/middlewares/error.js'
# ---- Step 3 ----
check "C3.1 schema has timestamps"  'grep -q "timestamps" backend/models/applicationSchema.js'
check "C3.2 applied date uses createdAt or _id, never Date.now()" 'grep -q "createdAt" frontend/src/components/Application/MyApplications.jsx && ! grep -q "createdAt || Date.now()" frontend/src/components/Application/MyApplications.jsx'
check "C3.3 controller still sorts by createdAt" 'grep -q "sort({ createdAt: -1 })" backend/controllers/applicationController.js'
# ---- Step 4 ----
check "C4.1 search=( and location=[ do not 500" '[ "$(code "$API/job/getall?search=(")" = "200" ] && [ "$(code "$API/job/getall?location=%5B")" = "200" ]'
check "C4.2 limit=100 returns success" 'curl -s -m 20 "$API/job/getall?limit=100" | grep -q "\"success\":true"'
check "C4.3 updateJob no longer passes req.body" '! grep -q "findByIdAndUpdate(id, req.body" backend/controllers/jobController.js'
check "C4.4 Jobs.jsx and CandidateDashboard.jsx ask for limit=100" 'grep -q "limit=100" frontend/src/components/Job/Jobs.jsx && grep -q "limit=100" frontend/src/components/Candidate/CandidateDashboard.jsx'
check "C4.5 search/location run through escapeRegex" 'grep -q "escapeRegex(search)" backend/controllers/jobController.js && grep -q "escapeRegex(location)" backend/controllers/jobController.js'
check "C4.6 salary filter kept in its own clause" 'grep -F "query.\$and" backend/controllers/jobController.js'
# ---- Step 5 ----
check "C5.1 authLoading exists in context" 'grep -q authLoading frontend/src/main.jsx'
check "C5.2 Login and Register call setUser" 'grep -q "setUser" frontend/src/components/Auth/Login.jsx && grep -q "setUser" frontend/src/components/Auth/Register.jsx'
check "C5.3 Context still exported from main.jsx" 'grep -q "export const Context" frontend/src/main.jsx'
check "C5.4 fetchUser finally clears authLoading" 'grep -q "setAuthLoading(false)" frontend/src/App.jsx'
check "C5.5 protected routes render instead of redirecting while loading" 'grep -q authLoading frontend/src/components/Layout/ProtectedRoute.jsx && grep -q authLoading frontend/src/components/Home/Home.jsx'
check "C5.6 MyApplications waits for the role" 'grep -q "authLoading || !user?.role" frontend/src/components/Application/MyApplications.jsx'
check "C5.7 frontend build" 'cd frontend && npm run build >/dev/null 2>&1'
# ---- Step 6 ----
check "C6.1 old unstyled classes gone" '! grep -q "className=\"resume-modal\"" frontend/src/components/Application/ResumeModal.jsx'
check "C6.2 overlay + close + backdrop click present" 'grep -q "fixed inset-0 z-50" frontend/src/components/Application/ResumeModal.jsx && grep -q "max-h-\[85vh\]" frontend/src/components/Application/ResumeModal.jsx && grep -q "onClick={onClose}" frontend/src/components/Application/ResumeModal.jsx'
check "C6.3 props signature unchanged" 'grep -q "imageUrl, onClose" frontend/src/components/Application/ResumeModal.jsx'
check "C6.4 modal still rendered by MyApplications" 'grep -q "{resumeImageUrl} onClose={closeModal}" frontend/src/components/Application/MyApplications.jsx'
# ---- Step 7 ----
check "C7.1 upload-resume without cookie -> 401" '[ "$(code -X POST $API/user/upload-resume)" = "401" ]'
check "C7.2 userController pdfParse guarded" 'grep -q "Could not read text from this PDF" backend/controllers/userController.js'
check "C7.3 pdfParse NOT inside the Cloudinary try" 'awk "/try \{/{t++} /cloudinary.uploader.upload/{u=t} /pdfParse\(dataBuffer\)/{p=t} END{exit !(u==1 && p==2)}" backend/controllers/applicationController.js'
check "C7.4 pdfParse still used at least once in applicationController" '[ "$(grep -c "pdfParse" backend/controllers/applicationController.js)" -ge 1 ]'
check "C7.5 Cloudinary failure message unchanged" 'grep -q "Failed to upload Resume to Cloudinary. Please check config." backend/controllers/applicationController.js'
# ---- Step 8 ----
check "C8.1 analyze-resume without cookie -> 401" '[ "$(code -X POST $API/ai/analyze-resume)" = "401" ]'
check "C8.2 aiService maps provider failure to 502" 'grep -q "502" backend/services/aiService.js'
check "C8.3 aiService 502 message exact" 'grep -q "AI service is unavailable right now. Please try again." backend/services/aiService.js'
check "C8.4 malformed-JSON messages preserved" 'grep -q "AI returned malformed JSON. Please try again." backend/services/aiService.js && grep -q "AI returned malformed JSON for job match." backend/services/aiService.js && grep -q "AI returned malformed JSON for skill gap." backend/services/aiService.js'
check "C8.5 aiService syntax" 'node --check backend/services/aiService.js'
# ---- Step 9 ----
check "C9.1 smoke script passes" 'node backend/scripts/smoke.mjs'
check "C9.2 smoke script uses no new dependency" 'grep -q "from \"fs/promises\"" backend/scripts/smoke.mjs && ! grep -qE "axios|require\(|form-data" backend/scripts/smoke.mjs'
check "C9.3 lint rules relaxed as agreed" 'grep -q "react/prop-types" frontend/.eslintrc.cjs && grep -q "no-unused-vars" frontend/.eslintrc.cjs'
check "C9.4 npm run lint exits 0" 'cd frontend && npm run lint >/dev/null 2>&1'
check "C9.5 legacy broken test files untouched" 'test -f backend/test_apply.js && test -f backend/test_apply2.js'
# ---- Step 10 ----  (append below as steps are completed)
# Part C Phase 5: AI fallback chain + interview route contract.
check "C10.1 aiService builds an ordered model chain" 'grep -q "modelChain" backend/services/aiService.js'
check "C10.2 chain reads GROQ_MODEL_FALLBACKS" 'grep -q "GROQ_MODEL_FALLBACKS" backend/services/aiService.js'
check "C10.3 fallbacks documented in .env.example" 'grep -q "GROQ_MODEL_FALLBACKS" backend/.env.example'
check "C10.4 interview-questions route registered" 'grep -q "/interview-questions" backend/routes/aiRoutes.js'
check "C10.5 interview-questions without cookie -> 401" '[ "$(code -X POST $API/ai/interview-questions)" = "401" ]'
# Part C Phase 9: job-detail AI panels + save + deadline.
check "C10.6 JobDetails calls skill-gap" 'grep -q "/ai/skill-gap" frontend/src/components/Job/JobDetails.jsx'
check "C10.7 JobDetails calls interview-questions" 'grep -q "/ai/interview-questions" frontend/src/components/Job/JobDetails.jsx'
check "C10.8 JobDetails save toggle wired both ways" 'grep -q "job/save" frontend/src/components/Job/JobDetails.jsx && grep -q "/job/saved" frontend/src/components/Job/JobDetails.jsx'
check "C10.9 JobDetails shows application deadline" 'grep -q "Application Deadline" frontend/src/components/Job/JobDetails.jsx'
check "C10.10 PostJob deadline input + payload" 'grep -q "type=\"date\"" frontend/src/components/Job/PostJob.jsx && grep -q "payload.deadline" frontend/src/components/Job/PostJob.jsx'
check "C10.11 save endpoints reject anonymous -> 401" '[ "$(code -X POST $API/job/save/000000000000000000000000)" = "401" ]'
check "C10.12 notifications reject anonymous -> 401" '[ "$(code $API/notifications)" = "401" ] && [ "$(code -X PUT $API/notifications/read-all)" = "401" ]'
# Part C Phase 9: bell in Navbar + route-mount contract + deadline filter.
check "C10.13 Navbar renders the notifications bell" 'grep -q "data-notif-bell" frontend/src/components/Layout/Navbar.jsx && grep -q "/notifications" frontend/src/components/Layout/Navbar.jsx'
check "C10.14 notification router mounted at /api/v1/notifications" 'grep -q "app.use(\"/api/v1/notifications\"" backend/app.js'
check "C10.15 past-deadline jobs filtered in getAllJobs" 'grep -F "deadline: { \$gte: new Date() }" backend/controllers/jobController.js'
# Part D (report §9): 3-key rotation pool + mock-mode contract.
check "C10.16 all three GROQ_API_KEY_* names documented and read" 'for k in 1 2 3; do grep -q "GROQ_API_KEY_$k" backend/.env.example || exit 1; done; grep -q "KEY_ENV_NAMES" backend/services/aiService.js'
check "C10.17 keypool unit test passes (429 advances keys before models)" 'node backend/scripts/test_keypool.mjs'
check "C10.18 requestChat authenticates from the key pool" 'grep -q "createKeyPool" backend/services/aiService.js && grep -q "keyEntry.key" backend/services/aiService.js && grep -q "shortestCooldownMs" backend/services/aiService.js'

echo "Passed: $PASS   Failed: $FAIL"; [ "$FAIL" -eq 0 ]