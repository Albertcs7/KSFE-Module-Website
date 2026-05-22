import { NextFunction, Response } from "express";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../config/env";
import { AuthenticatedRequest } from "./auth.middleware";

const parseCookies = (cookieHeader: string | undefined) => {
  const cookies: Record<string, string> = {};
  (cookieHeader || "").split("; ").forEach((c) => {
    const [k, v] = c.split("=");
    if (k && v) cookies[k.trim()] = decodeURIComponent(v.trim());
  });
  return cookies;
};

const getHeaderValue = (headers: any, headerName: string) => {
  const lowerHeader = headerName.toLowerCase();
  const value = headers[lowerHeader];
  if (Array.isArray(value)) return value[0];
  return value;
};

export const validateCsrf = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const method = req.method?.toUpperCase() || "";

  // Only validate CSRF for state-changing requests
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const csrfHeaderToken = getHeaderValue(req.headers, CSRF_HEADER_NAME);
  const csrfCookieToken = cookies[CSRF_COOKIE_NAME];

  if (!csrfCookieToken || !csrfHeaderToken) {
    res.status(403).json({ message: "CSRF token missing" });
    return;
  }

  if (csrfHeaderToken !== csrfCookieToken) {
    res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }

  next();
};
