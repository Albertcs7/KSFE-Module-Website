import { IncomingMessage, ServerResponse } from "http";
import { logger } from "../core/logger/logger";
import { db } from "../database/mysql";
import { insuranceRoutes } from "../modules/insurance/insurance.routes";
import { authRoutes } from "./auth.routes";
// later: import { insuranceRoutes } ...

export const router = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {

  const url = req.url || "";
  const method = req.method || "GET";

  res.setHeader("Content-Type", "application/json");

  // Auth routes
  if (url.startsWith("/auth")) {
    return await authRoutes(req, res); // returns true/false
  }
  
  //Insurance routes
  if (url.startsWith("/insurance")) {
    if (await insuranceRoutes(req, res)) return true;
  }

  // Root route
  if (url === "/" && method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify({ message: "KSFE API Running 🚀" }));
    return true;
  }

  // Health endpoint
  if (url === "/health" && method === "GET") {
    try {
      // quick DB ping
      db.getConnection().then((conn: { ping: () => Promise<any>; release: () => void; }) => {
        conn.ping().catch(() => {});
        conn.release();
      }).catch((err: { message: any; }) => {
        logger.warn("DB ping failed", { message: err.message });
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: err.message }));
    }

    return true;
  }

  return false; // ❗ no response here
};


//for autehication and autharisation use this
/*
import { authenticate, authorize } from "../../core/auth/auth.middleware";
import { runMiddlewares } from "../../core/http/middlewareRunner";

if (req.url === "/policies" && req.method === "GET") {

  const ok = runMiddlewares(req, res, [
    authenticate,
    authorize("viewPolicies"),
  ]);

  if (!ok) return;

  // Clean business logic
  res.end("Policies data");
}
*/