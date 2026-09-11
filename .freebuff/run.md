# Run doc — CareerConnect (React + Vite frontend, Express + MongoDB backend)

Two-process stack. The frontend calls the backend at `http://localhost:4000/api/v1`, and the backend connects to MongoDB Atlas using the URI in `backend/.env` — no local MongoDB needed.

## 1. Reproduce uncommitted artifacts (fresh checkout)

Copy the env files from the main checkout (they are gitignored; never commit or paste their values):

```bash
cp /Users/saivenkatakrishnasayanna/Downloads/react-job-portal-main/backend/.env  backend/.env
cp /Users/saivenkatakrishnasayanna/Downloads/react-job-portal-main/frontend/.env frontend/.env
```

`backend/.env` must define `PORT=4000`, `MONGO_URI`, `JWT_SECRET_KEY`, and the NVIDIA NIM key. Note: `backend/app.js` loads dotenv with `override: true`, so `.env` wins over any preset shell `PORT` (a preset `PORT=0` in the shell previously made the server bind a random port — the root cause of the reported 404s).

Install dependencies with npm (lockfiles are committed):

```bash
cd backend  && npm install
cd frontend && npm install
```

## 2. Run the stack

The servers must survive the terminal session, so run them detached under launchd (the current live setup):

```bash
UID_N=$(id -u)
PROJ=/Users/saivenkatakrishnasayanna/Downloads/react-job-portal-main
NODE_BIN=$(which node)

# Backend (port 4000)
launchctl submit -l cc.backend -- /bin/sh -c "cd $PROJ/backend && exec $NODE_BIN server.js > /tmp/cc-backend.log 2>&1"

# Frontend (Vite dev server, port 5173) — run vite.js via the absolute node binary;
# `npm run dev` fails under launchd ("env: node: No such file or directory")
launchctl submit -l cc.frontend -- /bin/sh -c "cd $PROJ/frontend && exec $NODE_BIN node_modules/vite/bin/vite.js > /tmp/cc-frontend.log 2>&1"
```

Stop later with `launchctl remove cc.backend` / `launchctl remove cc.frontend`.
Logs: `/tmp/cc-backend.log`, `/tmp/cc-frontend.log`.

### Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/                     # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/v1/job/getall    # 200 (public route)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/v1/user/getuser  # 401 (auth required — correct)
```

Route note: API mounts are singular — `/api/v1/job`, `/api/v1/application`, `/api/v1/user`, `/api/v1/ai`, `/api/v1/analytics`.
