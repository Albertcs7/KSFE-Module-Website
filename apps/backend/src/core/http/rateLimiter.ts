import { NextFunction, Request, Response } from "express";
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "../../config/env";
import { logger } from "../logger/logger";

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export const rateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = store.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  store.set(ip, entry);

  if (entry.count > RATE_LIMIT_REQUESTS) {
    logger.warn("Rate limit exceeded", { ip, count: entry.count });
    res.status(429).json({ message: "Too many requests" });
    return;
  }

  next();
};
