import { IncomingMessage,ServerResponse } from "http";
import { loginController } from "../core/auth/auth.contoller";

export const authRoutes = async (req:IncomingMessage,res:ServerResponse)=>{
    const url = req.url ||  ""
    const method = req.method || "GET"

    if (req.method === "POST" && req.url?.startsWith("/auth/login")){
        return loginController(req,res);
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ message: "Auth route not found" }));
}