import { Router } from "express";
import { logger } from "../core/logger/logger";
import { db } from "../database/mysql";
import { insuranceRoutes } from "../modules/insurance/insurance.routes";
import { authRoutes } from "./auth.routes";

export const router = Router();

router.use(authRoutes);
router.use(insuranceRoutes);

router.get("/", (_req, res) => {
  res.status(200).json({ message: "KSFE API Running" });
});

router.get("/health", async (_req, res) => {
  try {
    db.getConnection()
      .then((conn: { ping: () => Promise<any>; release: () => void }) => {
        conn.ping().catch(() => {});
        conn.release();
      })
      .catch((err: { message: any }) => {
        logger.warn("DB ping failed", { message: err.message });
      });

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});