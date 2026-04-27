import axiosInstance from "../http/axios";
import type { BackendLoginResponse } from "../types/auth.types";

export interface LoginPayload {
  UID: string;
  password: string;
  token: boolean;
}

/**
 * Auth API layer (pure HTTP client)
 */
export const loginApi = async (
    payload: LoginPayload): 
    Promise<BackendLoginResponse> => {
  const response = await axiosInstance.post<BackendLoginResponse>(
    "/auth/login",
    payload
  );

  return response.data;
};