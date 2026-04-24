import http from "http";
import { router } from "./routes";

export const createApp = () =>{
    const server = http.createServer((req,res)=> {
        router(req,res);
    });
return server;
}