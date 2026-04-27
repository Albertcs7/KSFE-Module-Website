import { IncomingMessage,ServerResponse } from "http";
import { authRoutes } from "./auth.routes"

export const router = (req:IncomingMessage,res:ServerResponse)=>{
    const  url = req.url || ""
    const method = req.method || "GET";

    res.setHeader("Content-Type", "application/json");

    if(url.startsWith("/auth")){
        return authRoutes(req,res);
    }
    if (url === "/" && method === "GET") {
    res.writeHead(200);
    return res.end(JSON.stringify({ message: "KSFE API Running 🚀" }));
  }

  res.writeHead(404);
  return res.end(JSON.stringify({ message: "Route not found" }));
}


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