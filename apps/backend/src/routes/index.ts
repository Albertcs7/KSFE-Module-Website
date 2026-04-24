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