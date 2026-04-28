import { IncomingMessage, ServerResponse } from "http";
import { loginController, logoutController, refreshController } from "../core/auth/auth.contoller";

export const authRoutes = async (req:IncomingMessage,res:ServerResponse)=>{
    const url = req.url ||  ""
    const method = req.method || "GET"

    if (req.method === "POST" && req.url?.startsWith("/auth/login")){
        return loginController(req,res);
    }

    if (req.method === "POST" && req.url?.startsWith("/auth/refresh")){
        return refreshController(req,res);
    }

    if (req.method === "POST" && req.url?.startsWith("/auth/logout")){
        return logoutController(req,res);
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ message: "Auth route not found" }));
}