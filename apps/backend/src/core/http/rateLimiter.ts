import { IncomingMessage, ServerResponse } from "http";
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "../../config/env";
import { logger } from "../logger/logger";

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

export const rateLimit = (req: IncomingMessage, res: ServerResponse): boolean => {
  const ip = req.socket.remoteAddress || "unknown";
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
    res.statusCode = 429;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Too many requests" }));
    return false;
  }

  return true;
};
