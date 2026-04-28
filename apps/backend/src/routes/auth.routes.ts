import { IncomingMessage, ServerResponse } from "http";
import { loginController, logoutController, refreshController } from "../core/auth/auth.contoller";

export const authRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {

  if (req.method === "POST" && req.url?.startsWith("/auth/login")) {
    await loginController(req, res);
    return true;
  }

  if (req.method === "POST" && req.url?.startsWith("/auth/refresh")) {
    await refreshController(req, res);
    return true;
  }

  if (req.method === "POST" && req.url?.startsWith("/auth/logout")) {
    await logoutController(req, res);
    return true;
  }

  return false; // ✅ important
};