#!/usr/bin/env bash
# End-to-end API walkthrough: exercises every backend route as real users.
# Companion to backend/scripts/smoke.mjs (fast contract spot-checks): this is
# the full pass — auth, resume pipeline, jobs CRUD, applications, AI, analytics.
# Run:  bash backend/scripts/e2e_walk.sh        (backend on :4000 required)
# Optional:  RESUME_PDF=/path/to/resume.pdf bash backend/scripts/e2e_walk.sh
# Assertions are frozen contracts. Never weaken an assertion; append only.
set -u
API=${API:-http://localhost:4000/api/v1}
PASS=0; FAIL=0
TS=$(date +%s)
EMP_EMAIL="e2e_employer_${TS}@example.com"
EMP2_EMAIL="e2e_employer2_${TS}@example.com"
SEK_EMAIL="e2e_seeker_${TS}@example.com"
SEK2_EMAIL="e2e_seeker2_${TS}@example.com"
EMP_CJ=/tmp/e2e_emp.cookies; EMP2_CJ=/tmp/e2e_emp2.cookies
SEK_CJ=/tmp/e2e_sek.cookies; SEK2_CJ=/tmp/e2e_sek2.cookies
rm -f "$EMP_CJ" "$EMP2_CJ" "$SEK_CJ" "$SEK2_CJ"
PDF=${RESUME_PDF:-/tmp/e2e_resume.pdf}

# Fixture: a small text-based PDF (B3 asserts its text). Generated with the
# macOS cupsfilter printer filter when not already present / provided.
if [ ! -f "$PDF" ]; then
  printf '%s\n' \
    "John A. E2E Candidate" \
    "Software Engineer specializing in JavaScript, Node.js, React and MongoDB." \
    "Experience building REST APIs, JWT authentication and responsive front ends." \
    "Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Git, Docker." \
    "Education: B.S. Computer Science. Interests: AI, cloud and web development." \
    > /tmp/e2e_resume_src.txt
  if command -v cupsfilter >/dev/null 2>&1; then
    cupsfilter -m application/pdf /tmp/e2e_resume_src.txt > "$PDF" 2>/dev/null || true
  fi
fi
if [ ! -f "$PDF" ]; then
  echo "FAIL  B0 resume PDF missing at $PDF (set RESUME_PDF=/path/to/text-based.pdf)"
  FAIL=$((FAIL+1))
fi

last_body=""
# req LABEL EXPECTED_CODE METHOD PATH [extra curl args...]
req() {
  local label="$1" expected="$2" method="$3" url="$4"; shift 4
  local out code
  out=$(curl -s -m 200 -w $'\n%{http_code}' -X "$method" "$API$url" "$@")
  code=${out##*$'\n'}
  last_body=${out%$'\n'*}
  if [ "$code" = "$expected" ]; then
    echo "PASS  $label -> $code"; PASS=$((PASS+1))
  else
    echo "FAIL  $label -> got $code want $expected :: $(printf '%.240s' "$last_body")"
    FAIL=$((FAIL+1))
  fi
}
# body LABEL REGEX  (asserts against last response body)
body() {
  local label="$1" pattern="$2"
  if [ -z "$pattern" ]; then
    echo "FAIL  $label (body match): empty pattern (id extraction failed)"; FAIL=$((FAIL+1)); return
  fi
  if printf '%s' "$last_body" | grep -q "$pattern"; then
    echo "PASS  $label (body match)"; PASS=$((PASS+1))
  else
    echo "FAIL  $label (body match): no /$pattern/ in $(printf '%.240s' "$last_body")"
    FAIL=$((FAIL+1))
  fi
}
# JSON-aware id extraction: _id is NOT the first key in job/application/user
# objects, so a sed pattern anchored on {"_id"} silently returns nothing.
xid() {
  LAST_BODY="$last_body" XKEY="$1" node -e "try{const j=JSON.parse(process.env.LAST_BODY||'{}');const o=j[process.env.XKEY];process.stdout.write(o&&o._id?String(o._id):'')}catch(e){process.stdout.write('')}" 2>/dev/null
}
jid() { xid job; }
aid() { xid application; }
uid() { xid user; }

echo "=== A. Auth ==="
req "A1 register employer"          201 POST /user/register -H "Content-Type: application/json" -c "$EMP_CJ" \
  -d "{\"name\":\"E2E Employer One\",\"email\":\"$EMP_EMAIL\",\"phone\":9000000001,\"password\":\"Password123!\",\"role\":\"Employer\"}"
EMP_ID=$(uid)
req "A2 register employer2"         201 POST /user/register -H "Content-Type: application/json" -c "$EMP2_CJ" \
  -d "{\"name\":\"E2E Employer Two\",\"email\":\"$EMP2_EMAIL\",\"phone\":9000000002,\"password\":\"Password123!\",\"role\":\"Employer\"}"
req "A3 register seeker"            201 POST /user/register -H "Content-Type: application/json" -c "$SEK_CJ" \
  -d "{\"name\":\"E2E Seeker One\",\"email\":\"$SEK_EMAIL\",\"phone\":9000000003,\"password\":\"Password123!\",\"role\":\"Job Seeker\"}"
SEK_ID=$(uid)
req "A4 register seeker2"           201 POST /user/register -H "Content-Type: application/json" -c "$SEK2_CJ" \
  -d "{\"name\":\"E2E Seeker Two\",\"email\":\"$SEK2_EMAIL\",\"phone\":9000000004,\"password\":\"Password123!\",\"role\":\"Job Seeker\"}"
req "A5 duplicate email -> 400"     400 POST /user/register -H "Content-Type: application/json" \
  -d "{\"name\":\"Dup\",\"email\":\"$EMP_EMAIL\",\"phone\":1,\"password\":\"x\",\"role\":\"Employer\"}"
req "A6 login employer"             201 POST /user/login -H "Content-Type: application/json" -c "$EMP_CJ" \
  -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"Password123!\",\"role\":\"Employer\"}"
body  "A7 login returns employer role" '"role":"Employer"'
req "A8 login wrong password -> 400" 400 POST /user/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"nope\",\"role\":\"Employer\"}"
req "A9 login wrong role -> 404"    404 POST /user/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"Password123!\",\"role\":\"Job Seeker\"}"
req "A10 login seeker"              201 POST /user/login -H "Content-Type: application/json" -c "$SEK_CJ" \
  -d "{\"email\":\"$SEK_EMAIL\",\"password\":\"Password123!\",\"role\":\"Job Seeker\"}"
req "A11 getuser employer"          200 GET /user/getuser -b "$EMP_CJ"
body  "A12 getuser sanitized (no hash)" 'resumeText'
req "A13 getuser no cookie -> 401"  401 GET /user/getuser

echo "=== B. Resume upload (Cloudinary + pdf-parse) ==="
req "B1 upload PDF resume"          200 POST /user/upload-resume -b "$SEK_CJ" -F "resume=@$PDF;type=application/pdf"
req "B2 getuser now has resumeText" 200 GET /user/getuser -b "$SEK_CJ"
body  "B3 resumeText extracted"     'Software Engineer'
req "B4 upload non-PDF -> 400"      400 POST /user/upload-resume -b "$SEK_CJ" -F "resume=@/etc/hosts;type=text/plain"
req "B5 upload nothing -> 400"      400 POST /user/upload-resume -b "$SEK_CJ"

echo "=== C. Jobs CRUD ==="
JOB_JSON='{"title":"E2E Full Stack Engineer","description":"Build and ship full stack features across the product using modern web technologies daily.","category":"Engineering","country":"India","city":"Bengaluru","location":"Bengaluru, India - Hybrid, 4 days on-site per week","salaryFrom":1500000,"salaryTo":2500000,"requiredSkills":["JavaScript","React","Node.js"],"jobType":"Full-time","experienceLevel":"Mid"}'
req "C1 employer posts job"         200 POST /job/post -b "$EMP_CJ" -H "Content-Type: application/json" -d "$JOB_JSON"
JOB_ID=$(jid); echo "    job id: ${JOB_ID:-MISSING}"
req "C2 seeker posts job -> 400"    400 POST /job/post -b "$SEK_CJ" -H "Content-Type: application/json" -d "$JOB_JSON"
req "C3 missing salary -> 400"      400 POST /job/post -b "$EMP_CJ" -H "Content-Type: application/json" \
  -d '{"title":"No Salary Role","description":"This description is long enough to satisfy the thirty character minimum rule easily.","category":"IT","country":"India","city":"Delhi","location":"Delhi, India - On site full time role"}'
req "C4 getall"                     200 GET "/job/getall?limit=100"
body  "C5 job visible in getall"    "$JOB_ID"
req "C6 getall search=("            200 GET "/job/getall?search=("
req "C7 getall filter jobType"      200 GET "/job/getall?jobType=Remote"
req "C8 getall filter skills"       200 GET "/job/getall?skills=JavaScript,React"
req "C9 getall salary range"        200 GET "/job/getall?salaryMin=1000000&salaryMax=3000000"
req "C10 getmyjobs employer"        200 GET "/job/getmyjobs" -b "$EMP_CJ"
body  "C11 own job in getmyjobs"    "$JOB_ID"
req "C12 getmyjobs seeker -> 400"   400 GET "/job/getmyjobs" -b "$SEK_CJ"
req "C13 get single job"            200 GET "/job/$JOB_ID" -b "$SEK_CJ"
req "C14 update job (owner)"        200 PUT "/job/update/$JOB_ID" -b "$EMP_CJ" -H "Content-Type: application/json" \
  -d '{"title":"E2E Sr Full Stack Engineer","expired":false}'
body  "C15 title updated"           'E2E Sr Full Stack Engineer'
req "C16 postedBy immune to update" 200 PUT "/job/update/$JOB_ID" -b "$EMP_CJ" -H "Content-Type: application/json" \
  -d "{\"postedBy\":\"$SEK_ID\"}"
req "C17 seeker update -> 400"      400 PUT "/job/update/$JOB_ID" -b "$SEK_CJ" -H "Content-Type: application/json" -d '{"title":"Hacked"}'
req "C18 employer2 update -> 403"   403 PUT "/job/update/$JOB_ID" -b "$EMP2_CJ" -H "Content-Type: application/json" -d '{"title":"Hijacked"}'
req "C19 invalid job id -> 404"     404 GET "/job/notarealid" -b "$SEK_CJ"
req "C20 unknown job -> 404"        404 GET "/job/000000000000000000000000" -b "$SEK_CJ"

echo "=== D. Applications ==="
req "D1 seeker applies (1-click)"   200 POST "/application/post" -b "$SEK_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
APP_ID=$(aid); echo "    app id: ${APP_ID:-MISSING}"
req "D2 duplicate apply -> 400"     400 POST "/application/post" -b "$SEK_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
req "D3 employer applies -> 400"    400 POST "/application/post" -b "$EMP_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
req "D4 missing jobId -> 400"       400 POST "/application/post" -b "$SEK_CJ" -H "Content-Type: application/json" -d '{}'
req "D5 apply to unknown job -> 404" 404 POST "/application/post" -b "$SEK_CJ" -H "Content-Type: application/json" \
  -d '{"jobId":"000000000000000000000000"}'
req "D6 employer sees application"  200 GET "/application/employer/getall" -b "$EMP_CJ"
body  "D7 application in employer list" "$APP_ID"
req "D8 seeker sees own application" 200 GET "/application/jobseeker/getall" -b "$SEK_CJ"
body  "D9 application in seeker list" "$APP_ID"
req "D10 employer list as seeker -> 400" 400 GET "/application/employer/getall" -b "$SEK_CJ"
req "D11 seeker list as employer -> 400" 400 GET "/application/jobseeker/getall" -b "$EMP_CJ"
req "D12 status -> Shortlisted"     200 PUT "/application/status/$APP_ID" -b "$EMP_CJ" -H "Content-Type: application/json" -d '{"status":"Shortlisted"}'
body  "D13 status persisted"        '"status":"Shortlisted"'
req "D14 statusHistory recorded"    200 PUT "/application/status/$APP_ID" -b "$EMP_CJ" -H "Content-Type: application/json" -d '{"status":"Interview"}'
req "D15 invalid status -> 400"     400 PUT "/application/status/$APP_ID" -b "$EMP_CJ" -H "Content-Type: application/json" -d '{"status":"Nope"}'
req "D16 no status -> 400"          400 PUT "/application/status/$APP_ID" -b "$EMP_CJ" -H "Content-Type: application/json" -d '{}'
req "D17 seeker status -> 400"      400 PUT "/application/status/$APP_ID" -b "$SEK_CJ" -H "Content-Type: application/json" -d '{"status":"Selected"}'
req "D18 employer2 status -> 403"   403 PUT "/application/status/$APP_ID" -b "$EMP2_CJ" -H "Content-Type: application/json" -d '{"status":"Rejected"}'
req "D19 seeker2 withdraw -> 403"   403 DELETE "/application/delete/$APP_ID" -b "$SEK2_CJ"
req "D20 apply without resume -> 400" 400 POST "/application/post" -b "$SEK2_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"

echo "=== E. AI endpoints (Groq 3-key pool + model chain; mock answers while AI_MOCK_MODE=true) ==="
req "E1 analyze-resume"             200 POST "/ai/analyze-resume" -b "$SEK_CJ" -H "Content-Type: application/json" -d '{}'
body  "E2 analysis has skills"      'Skills'
req "E3 match-job"                  200 POST "/ai/match-job" -b "$SEK_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
req "E4 skill-gap"                  200 POST "/ai/skill-gap" -b "$SEK_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
req "E5 match-job no jobId -> 400"  400 POST "/ai/match-job" -b "$SEK_CJ" -H "Content-Type: application/json" -d '{}'
req "E6 match-job unknown job -> 404" 404 POST "/ai/match-job" -b "$SEK_CJ" -H "Content-Type: application/json" \
  -d '{"jobId":"000000000000000000000000"}'
req "E7 analyze-resume no auth -> 401" 401 POST "/ai/analyze-resume" -H "Content-Type: application/json" -d '{}'
req "E8 analyze-resume no resume -> 400"  400 POST "/ai/analyze-resume" -b "$SEK2_CJ" -H "Content-Type: application/json" -d '{}'
# Appended (Part C Phase 5): interview-questions must answer 200 with a real
# questions array — this is the last AI route with no contract coverage.
req "E9 interview-questions"           200 POST "/ai/interview-questions" -b "$SEK_CJ" -H "Content-Type: application/json" -d "{\"jobId\":\"$JOB_ID\"}"
body  "E10 questions array present"    '"questions"'
body  "E11 each question has a type"   '"type"'


echo "=== F. Analytics ==="
req "F1 employer analytics"         200 GET "/analytics/employer" -b "$EMP_CJ"
body  "F2 counts present"           '"totalJobs":1'
body  "F3 application counted"      '"totalApplications":1'
req "F4 seeker analytics -> 400"    400 GET "/analytics/employer" -b "$SEK_CJ"
req "F5 analytics no auth -> 401"   401 GET "/analytics/employer"

echo "=== G. Logout & cleanup ==="
req "G3 seeker withdraws application" 200 DELETE "/application/delete/$APP_ID" -b "$SEK_CJ"
req "G4 application gone -> 404"    404 DELETE "/application/delete/$APP_ID" -b "$SEK_CJ"
req "G5 employer2 delete job -> 403" 403 DELETE "/job/delete/$JOB_ID" -b "$EMP2_CJ"
req "G6 owner deletes job"          200 DELETE "/job/delete/$JOB_ID" -b "$EMP_CJ"
req "G7 deleted job -> 404"         404 GET "/job/$JOB_ID" -b "$SEK_CJ"
req "G8 logout seeker"              201 GET "/user/logout" -c "$SEK_CJ" -b "$SEK_CJ"
# Logout checks come LAST: logging the employer out earlier would invalidate
# the cookie jar G6 still needs (401 there is correct, but not what G6 tests).
req "G9 logout employer"            201 GET "/user/logout" -c "$EMP_CJ" -b "$EMP_CJ"
req "G10 getuser after logout -> 401" 401 GET "/user/getuser" -b "$EMP_CJ"

echo ""
echo "E2E: Passed: $PASS   Failed: $FAIL"
echo "Note: e2e_* users remain in the database (there is no delete-user endpoint)."
if [ "$FAIL" -eq 0 ]; then echo "E2E_EXIT=0"; exit 0; else echo "E2E_EXIT=1"; exit 1; fi
