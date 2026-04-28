import http from "http";
import { router } from "./routes";

const allowedOrigins = [
  "http://localhost:5173",
  "https://yourfrontend.com"
];

export const createApp = () => {
  const server = http.createServer(async (req, res) => {

    // ✅ 1. Handle CORS FIRST
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin || "")) {
      res.setHeader("Access-Control-Allow-Origin", origin as string);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Allow cookies/credentials for refresh token cookie
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // ✅ 2. Handle preflight (VERY IMPORTANT)
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Credentials": "true" });
      res.end();
      return;
    }

    // ✅ 3. Router safety (THIS is where your code goes)
    const handled = await router(req, res);

    if (!handled) {
      res.writeHead(404);
      res.end(JSON.stringify({ message: "Route not found" }));
    }
  });

  return server;
};