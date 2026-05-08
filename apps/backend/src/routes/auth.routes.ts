import { IncomingMessage, ServerResponse } from "http";
import { loginController, logoutController, refreshController } from "../core/auth/auth.contoller";

export const authRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  // POST LOGIN (Public - no token required)
  if (req.method === "POST" && req.url?.startsWith("/auth/login")) {
    await loginController(req, res);
    return true;
  }

  // POST REFRESH (Public - uses refresh token cookie)
  if (req.method === "POST" && req.url?.startsWith("/auth/refresh")) {
    await refreshController(req, res);
    return true;
  }

  // POST LOGOUT (Protected - requires Authorization: Bearer <token>)
  if (req.method === "POST" && req.url?.startsWith("/auth/logout")) {
    await logoutController(req, res);
    return true;
  }

  return false; // ✅ important
};