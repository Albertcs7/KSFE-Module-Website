import { loginBody } from "../../core/auth/auth.types";
import { externalAuthClient } from "./externalAuth.client";

export const externalAuthLogin = async (data:loginBody) =>{
    try{
        const payload={
            UID:data.UID,
            password:data.password,
            token:data.token,
        }

        const response = await externalAuthClient("/admin/login",payload);

        return response; 
    }catch(error:any){
        throw new Error(error.message || "External auth failed");
    }
};