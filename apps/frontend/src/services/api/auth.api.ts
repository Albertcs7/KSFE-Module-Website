import axiosInstance from "../http/axios";
import type { LoginApiResponse } from "../types/auth.types";

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
    Promise<LoginApiResponse> => {
  const response = await axiosInstance.post<LoginApiResponse>(
    "/admin/login",
    payload
  );

  return response.data;
};