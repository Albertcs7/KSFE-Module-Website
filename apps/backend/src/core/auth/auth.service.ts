import { loginBody } from "./auth.types";
import { externalAuthLogin } from "../../integrations/external-auth/externalAuth.service"

/**
 * Service: Handles login business logic
 */
export const loginService = async (data: loginBody) => {
  try {
    const response = await externalAuthLogin(data);

    // IMPORTANT:
    // Do NOT modify response structure
    // External API response is your source of truth
    return response;
  } catch (error: any) {
    throw new Error(error.message || "Auth service failed");
  }
};