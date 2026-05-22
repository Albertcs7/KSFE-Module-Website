import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from "../../config/env";
import type { AuthTokenClaims } from "./auth.session";

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenClaims & jwt.JwtPayload;
}

// Authentication
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as AuthTokenClaims & jwt.JwtPayload;

    req.user = decoded;

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Authorization
export const authorize = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

    if (!userPermissions.includes(requiredPermission)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
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