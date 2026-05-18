import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

const loadDotEnv = (): void => {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const fileContents = fs.readFileSync(envPath, "utf8");
  const lines = fileContents.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const value = trimmedLine.slice(equalsIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadDotEnv();

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const JWT_SECRET = requiredEnv("JWT_SECRET");
export const PORT = process.env.PORT || "5000";
// Prefer explicit REFRESH_TOKEN_SECRET, but fall back to JWT_SECRET for local/dev convenience
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
export const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refreshToken";
export const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN";
export const CSRF_HEADER_NAME = process.env.CSRF_HEADER_NAME || "x-csrf-token";
export const JWT_ISSUER = process.env.JWT_ISSUER || "ksfe-backend";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "ksfe-frontend";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const EXTERNAL_AUTH_API_URL = process.env.EXTERNAL_AUTH_API_URL || "https://stagemobileapi.ksfeonline.com";

// DB envs - fail fast when missing in non-test environments
export const DB_HOST = requiredEnv("DB_HOST");
export const DB_USER = requiredEnv("DB_USER");
export const DB_PASSWORD = requiredEnv("DB_PASSWORD");
export const DB_NAME = requiredEnv("DB_NAME");

export const RATE_LIMIT_REQUESTS = Number(process.env.RATE_LIMIT_REQUESTS || "60");
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || "60000");
export const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const PDF_USE_FRONTEND = String(process.env.PDF_USE_FRONTEND || "false").toLowerCase() === "true";
export const PDF_AUTH_TOKEN = process.env.PDF_AUTH_TOKEN || "";
export const FRONTEND_PREVIEW_BASE_URL = process.env.FRONTEND_PREVIEW_BASE_URL || "http://localhost:5173";
export const PDF_MAX_CONCURRENCY = Number(process.env.PDF_MAX_CONCURRENCY || "2");