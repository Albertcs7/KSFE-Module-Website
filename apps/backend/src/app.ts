import http from "http";
import { CORS_ALLOWED_ORIGINS } from "./config/env";
import { rateLimit } from "./core/http/rateLimiter";
import { attachRequestLogger } from "./core/http/requestLogger";
import { logger } from "./core/logger/logger";
import { router } from "./routes";

export const createApp = () => {
  const server = http.createServer(async (req, res) => {
    attachRequestLogger(req, res);

    // ✅ 1. Handle CORS FIRST
    const origin = req.headers.origin;
    res.setHeader("Vary", "Origin");

    if (CORS_ALLOWED_ORIGINS.includes(origin || "")) {
      res.setHeader("Access-Control-Allow-Origin", origin as string);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
    // Allow cookies/credentials for refresh token cookie
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // ✅ Rate limiting (in-memory for Phase 1)
    if (!rateLimit(req, res)) return;

    // ✅ 2. Handle preflight (VERY IMPORTANT)
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Credentials": "true" });
      res.end();
      return;
    }

    // ✅ 3. Router safety (THIS is where your code goes)
    try {
      const handled = await router(req, res);

      if (!handled) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: "Route not found" }));
      }
    } catch (err: any) {
      logger.error("Unhandled route error", { message: err.message });
      res.writeHead(500);
      res.end(JSON.stringify({ message: "Internal Server Error" }));
    }
  });

  logger.debug("HTTP application created");

  return server;
};