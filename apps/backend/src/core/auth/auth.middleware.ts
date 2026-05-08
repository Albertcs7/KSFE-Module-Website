import { IncomingMessage, ServerResponse } from "http";
import jwt from "jsonwebtoken";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from "../../config/env";
import type { AuthTokenClaims } from "./auth.session";

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthTokenClaims & jwt.JwtPayload;
}

// Authentication
export const authenticate = (
  req: AuthenticatedRequest,
  res: ServerResponse
): boolean => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return false;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as AuthTokenClaims & jwt.JwtPayload;

    req.user = decoded;

    return true;
  } catch {
    res.statusCode = 401;
    res.end(JSON.stringify({ message: "Invalid token" }));
    return false;
  }
};

// Authorization
export const authorize = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: ServerResponse): boolean => {
    if (!req.user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "Unauthorized" }));
      return false;
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

    if (!userPermissions.includes(requiredPermission)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ message: "Forbidden" }));
      return false;
    }

    return true;
  };
};


// use for authenticati and autheraisation
/*
if (!authenticate(req, res)) return;
if (!authorize("viewPolicies")(req, res)) return;
*/
//OR
/*
import { authenticate, authorize } from "../../core/auth/auth.middleware";
import { runMiddlewares } from "../../core/http/middlewareRunner";

if (req.url === "/policies" && req.method === "GET") {

  const allowed = runMiddlewares(req, res, [
    authenticate,
    authorize("viewPolicies"),
  ]);

  if (!allowed) return;

  // ✅ Clean business logic
  res.end("Policies data");
}
*/