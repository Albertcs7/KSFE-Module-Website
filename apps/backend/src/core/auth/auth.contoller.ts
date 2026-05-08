import { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRES_IN, CSRF_COOKIE_NAME, CSRF_HEADER_NAME, JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET, NODE_ENV, REFRESH_COOKIE_NAME, REFRESH_TOKEN_SECRET } from "../../config/env";
import { loginService } from "./auth.service";
import { revokeRefreshSession, rotateRefreshSession } from "./auth.session";
import { loginBody } from "./auth.types";

/**
 * Reads and parses a JSON request body from an incoming HTTP request.
 *
 * @typeParam T - Expected shape of the parsed body.
 * @param req - Node.js incoming request stream.
 * @returns Promise resolving to the parsed body object.
 * @throws Error when the body is invalid JSON or stream reading fails.
 */
const parseBody = async <T>(req: IncomingMessage): Promise<T> => {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
        });

    req.on("end", () => {
      try {
                const parsed = JSON.parse(body || "{}");
                resolve(parsed as T);
      } catch {
                reject(new Error("Invalid JSON"));
            }
        });

        req.on("error", () => {
      reject(new Error("Error reading request body"));
        });
    });
};

const parseCookies = (cookieHeader: string | undefined) => {
  const cookies: Record<string, string> = {};

  (cookieHeader || "").split("; ").forEach((c) => {
    const [k, v] = c.split("=");
    if (k && v) cookies[k.trim()] = v.trim();
  });

  return cookies;
};

const getHeaderValue = (headers: IncomingMessage["headers"], headerName: string) => {
  const lowerHeader = headerName.toLowerCase();
  const value = headers[lowerHeader];
  if (Array.isArray(value)) return value[0];
  return value;
};

const buildCookie = (name: string, value: string, options: string[]) => {
  return [
    `${name}=${value}`,
    ...options,
  ].join("; ");
};

const secureCookieOptions = () => {
  const parts = ["HttpOnly", "Path=/", "SameSite=Strict"];

  if (NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts;
};

/**
 * Handles login requests.
 *
 * Expects a JSON body with:
 * - UID: string
 * - password: string
 *
 * Response behavior:
 * - 200: Authentication processed successfully.
 * - 400: Missing required fields or invalid request payload.
 */
export const loginController = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    // ✅ Strongly typed request body
    const body = await parseBody<loginBody>(req);

    // (Optional) Basic validation
    if (!body.UID || !body.password) {
      res.writeHead(400);
      return res.end(
        JSON.stringify({
          status: false,
          message: "UID and password are required",
        })
      );
    }

    // Call service
    const result = await loginService(body);

    const { refreshToken, csrfToken, ...responseBody } = result as any;

    res.setHeader("Set-Cookie", [
      buildCookie(REFRESH_COOKIE_NAME, refreshToken, secureCookieOptions()),
      buildCookie(CSRF_COOKIE_NAME, csrfToken, NODE_ENV === "production" ? ["Path=/", "SameSite=Strict", "Secure"] : ["Path=/", "SameSite=Strict"]),
    ]);

    // Return JSON (access token included in result.data.token)
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(responseBody));
  } catch (error: any) {
    res.writeHead(400);
    return res.end(
      JSON.stringify({
        status: false,
        message: error.message || "Login failed",
      })
    );
  }
};

export const refreshController = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const csrfHeader = getHeaderValue(req.headers, CSRF_HEADER_NAME);

    const token = cookies[REFRESH_COOKIE_NAME];

    if (!token) {
      res.writeHead(401);
      return res.end(JSON.stringify({ status: false, message: "Refresh token missing" }));
    }

    if (!csrfHeader) {
      res.writeHead(403);
      return res.end(JSON.stringify({ status: false, message: "CSRF token missing" }));
    }

    const rotated = rotateRefreshSession(token, csrfHeader);

    const accessToken = jwt.sign(rotated.payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    res.setHeader("Set-Cookie", [
      buildCookie(REFRESH_COOKIE_NAME, rotated.refreshToken, secureCookieOptions()),
      buildCookie(CSRF_COOKIE_NAME, rotated.csrfToken, NODE_ENV === "production" ? ["Path=/", "SameSite=Strict", "Secure"] : ["Path=/", "SameSite=Strict"]),
    ]);

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: true, message: "Token refreshed", data: { token: accessToken } }));
  } catch (error: any) {
    res.writeHead(401);
    return res.end(JSON.stringify({ status: false, message: "Invalid refresh token" }));
  }
};

export const logoutController = async (req: IncomingMessage, res: ServerResponse) => {
  const cookies = parseCookies(req.headers.cookie);
  const csrfHeader = getHeaderValue(req.headers, CSRF_HEADER_NAME);

  const refreshToken = cookies[REFRESH_COOKIE_NAME];

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as any;

      if (!csrfHeader) {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: false, message: "CSRF token missing" }));
      }

      revokeRefreshSession(refreshToken);
      void decoded;
    } catch {
      // proceed to clear client cookies regardless
    }
  }

  res.setHeader("Set-Cookie", [
    buildCookie(REFRESH_COOKIE_NAME, "", ["HttpOnly", "Path=/", "SameSite=Strict", "Expires=Thu, 01 Jan 1970 00:00:00 GMT", ...(NODE_ENV === "production" ? ["Secure"] : [])]),
    buildCookie(CSRF_COOKIE_NAME, "", ["Path=/", "SameSite=Strict", "Expires=Thu, 01 Jan 1970 00:00:00 GMT", ...(NODE_ENV === "production" ? ["Secure"] : [])]),
  ]);
  res.writeHead(200, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ status: true, message: "Logged out" }));
};