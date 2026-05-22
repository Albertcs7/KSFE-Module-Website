import { Router, type NextFunction, type Request, type Response } from "express";
import { loginController, logoutController, refreshController } from "../core/auth/auth.contoller";

const asyncRoute = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export const authRoutes = Router();

authRoutes.post("/auth/login", asyncRoute(async (req, res) => {
  await loginController(req, res);
}));

authRoutes.post("/auth/refresh", asyncRoute(async (req, res) => {
  await refreshController(req, res);
}));

authRoutes.post("/auth/logout", asyncRoute(async (req, res) => {
  await logoutController(req, res);
}));