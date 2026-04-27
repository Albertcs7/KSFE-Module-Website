import jwt from "jsonwebtoken";
import { IncomingMessage, ServerResponse } from "http";

const JWT_SECRET = "your_secret_key";

export interface AuthenticatedRequest extends IncomingMessage {
  user?: any;
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

    const decoded = jwt.verify(token, JWT_SECRET);

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

    const userPermissions = req.user.permissions || [];

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