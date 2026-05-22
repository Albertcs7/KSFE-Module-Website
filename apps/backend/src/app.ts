import express from "express";
import { CORS_ALLOWED_ORIGINS } from "./config/env";
import { rateLimit } from "./core/http/rateLimiter";
import { attachRequestLogger } from "./core/http/requestLogger";
import { logger } from "./core/logger/logger";
import { router } from "./routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use((req, res, next) => {
    attachRequestLogger(req, res);
    next();
  });

    // ✅ 1. Handle CORS FIRST
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader("Vary", "Origin");

    if (CORS_ALLOWED_ORIGINS.includes(origin || "")) {
      res.setHeader("Access-Control-Allow-Origin", origin as string);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
    // Allow cookies/credentials for refresh token cookie
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // ✅ 2. Handle preflight (VERY IMPORTANT)
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // ✅ Rate limiting (in-memory for Phase 1)
  app.use(rateLimit);

  app.use(router);

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("Unhandled route error", { message });
    res.status(500).json({ message: "Internal Server Error" });
  });

  logger.debug("HTTP application created");

  return app;
};