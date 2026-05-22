import { Request, Response } from "express";
import { logger } from "../logger/logger";

const getRoute = (url?: string): string => {
  if (!url) {
    return "/";
  }

  try {
    return new URL(url, "http://localhost").pathname || "/";
  } catch {
    return url.split("?")[0] || "/";
  }
};

export const attachRequestLogger = (req: Request, res: Response): void => {
  const startedAt = process.hrtime.bigint();

  res.once("finish", () => {
    const responseTimeMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("HTTP request completed", {
      method: req.method || "GET",
      route: getRoute(req.url),
      statusCode: res.statusCode,
      responseTimeMs: Number(responseTimeMs.toFixed(2)),
    });
  });
};