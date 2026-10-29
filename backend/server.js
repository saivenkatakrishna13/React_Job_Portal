import app from "./app.js";
import cloudinary from "cloudinary";
import { isMockMode } from "./services/aiService.js";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // CLOUDINARY_CLIENT_NAME
  api_key: process.env.CLOUDINARY_API_KEY,       // CLOUDINARY_CLIENT_API
  api_secret: process.env.CLOUDINARY_API_SECRET, // CLOUDINARY_CLIENT_SECRET
});

// Warn (never crash, never print values) if a required variable is missing.
const REQUIRED_ENV_VARS = [
  "MONGO_URI",
  "JWT_SECRET_KEY",
  "JWT_EXPIRE",
  "COOKIE_EXPIRE",
  "FRONTEND_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  // The keys are only required for LIVE calls: mock mode (AI_MOCK_MODE=true,
  // or simply no key yet) runs without them on purpose (report §10). All
  // three names are listed so a half-configured pool is noticed at startup.
  ...(isMockMode()
    ? []
    : ["GROQ_API_KEY_1", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]),
];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.warn(
    `WARNING: missing environment variables (names only): ${missingEnvVars.join(", ")}`
  );
}

// Without these two the server cannot function — fail fast, names only.
const fatalEnvVars = ["MONGO_URI", "JWT_SECRET_KEY"].filter(
  (name) => !process.env[name]
);
if (fatalEnvVars.length > 0) {
  console.error(
    `FATAL: required environment variables missing (names only): ${fatalEnvVars.join(", ")}`
  );
  process.exit(1);
}

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running at port ${process.env.PORT || 4000}`);
});