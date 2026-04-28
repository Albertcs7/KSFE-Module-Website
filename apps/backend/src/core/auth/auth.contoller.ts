import { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRES_IN, JWT_SECRET, NODE_ENV, REFRESH_COOKIE_NAME, REFRESH_TOKEN_SECRET } from "../../config/env";
import { loginService } from "./auth.service";
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

    // Set refresh token in HttpOnly cookie (not present in JSON body)
    const refreshToken = (result as any).refreshToken;

    const cookieParts = [`${REFRESH_COOKIE_NAME}=${refreshToken}`, `HttpOnly`, `Path=/`, `SameSite=Lax`];

    if (NODE_ENV === "production") {
      cookieParts.push("Secure");
    }

    res.setHeader("Set-Cookie", cookieParts.join("; "));

    // Return JSON (access token included in result.data.token)
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
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
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};

    cookieHeader.split("; ").forEach((c) => {
      const [k, v] = c.split("=");
      if (k && v) cookies[k.trim()] = v.trim();
    });

    const token = cookies[REFRESH_COOKIE_NAME];

    if (!token) {
      res.writeHead(401);
      return res.end(JSON.stringify({ status: false, message: "Refresh token missing" }));
    }

    // Verify refresh token
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as any;

    // Sign new access token from decoded payload
    const accessToken = jwt.sign(
      {
        role: decoded.role,
        employeeId: decoded.employeeId,
        branchId: decoded.branchId,
        designation: decoded.designation,
        permissions: decoded.permissions,
        modules: decoded.modules,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN as any }
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: true, message: "Token refreshed", data: { token: accessToken } }));
  } catch (error: any) {
    res.writeHead(401);
    return res.end(JSON.stringify({ status: false, message: "Invalid refresh token" }));
  }
};

export const logoutController = async (req: IncomingMessage, res: ServerResponse) => {
  // Clear the refresh cookie
  const cookieParts = [`${REFRESH_COOKIE_NAME}=`, `HttpOnly`, `Path=/`, `SameSite=Lax`, `Expires=Thu, 01 Jan 1970 00:00:00 GMT`];

  if (NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
  res.writeHead(200, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ status: true, message: "Logged out" }));
};