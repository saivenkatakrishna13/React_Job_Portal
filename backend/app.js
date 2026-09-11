import express from "express";
import dbConnection  from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import { config } from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

const app = express();
// backend/.env is the source of truth for configuration. `override: true` prevents
// a stray preset environment variable (e.g. PORT=0) from silently making the
// server listen on the wrong port, which breaks every frontend API call with 404s.
config({ path: "./.env", override: true });

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    method: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/job", jobRouter);
app.use("/api/v1/application", applicationRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/analytics", analyticsRouter);
dbConnection();

app.use(errorMiddleware);
export default app;
