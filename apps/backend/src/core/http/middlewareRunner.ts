import { ServerResponse } from "http";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export type Middleware = (
  req: AuthenticatedRequest,
  res: ServerResponse
) => boolean;

export const runMiddlewares = (
  req: AuthenticatedRequest,
  res: ServerResponse,
  middlewares: Middleware[]
): boolean => {
  for (const middleware of middlewares) {
    const result = middleware(req, res);
    if (!result) return false; // stop if any middleware fails
  }
  return true;
};