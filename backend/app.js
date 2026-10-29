import express from "express";
import dbConnection  from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";

const app = express();

// backend/.env is the source of truth for configuration. `override: true` prevents
// a stray preset environment variable (e.g. PORT=0) from silently making the
// server listen on the wrong port, which breaks every frontend API call with 404s.
// The path is resolved from THIS FILE's location, so `node backend/server.js`
// works from the project root as well as from backend/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env"), override: true });

// FRONTEND_URL may hold one origin or a comma-separated list.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security headers. CSP is off because this server only serves JSON (the SPA
// lives on its own origin); CORP is cross-origin so the :5173 frontend can
// still read responses.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NoSQL-injection guard: strip `$`/dot-operator keys from bodies and queries.
// Must run AFTER the body parsers so it sees parsed objects.
app.use(mongoSanitize());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
  })
);
// Brute-force and AI-credit protection (Part A #4), 15 min sliding window per
// IP. MUST be mounted before the routers or the router answers first and the
// limiter never runs. Limits sit ABOVE the gate+smoke+e2e double-run budget so
// the mandated "run the gate twice, both green" check never trips them.
const FIFTEEN_MIN = 15 * 60 * 1000;
const tooManyRequests = (req, res) =>
  res
    .status(429)
    .json({ success: false, message: "Too many requests. Please try again later." });
const makeLimiter = (limit) =>
  rateLimit({
    windowMs: FIFTEEN_MIN,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: tooManyRequests,
  });
app.use("/api/v1/user/register", makeLimiter(60));
app.use("/api/v1/user/login", makeLimiter(30));
app.use("/api/v1/ai", makeLimiter(30));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/notifications", notificationRouter);

// Health/readiness endpoint for deployment checks (Part A #20).
app.get("/api/v1/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  res.status(dbState === "connected" ? 200 : 503).json({
    success: dbState === "connected",
    status: dbState === "connected" ? "ok" : "degraded",
    db: dbState,
    uptime: process.uptime(),
  });
});

// Unknown routes answer JSON, never Express's default HTML 404.
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Resource not found: ${req.method} ${req.originalUrl}` });
});
dbConnection();

app.use(errorMiddleware);
export default app;