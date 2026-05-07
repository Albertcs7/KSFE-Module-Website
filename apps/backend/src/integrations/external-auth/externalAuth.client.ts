import axios, { AxiosError } from "axios";
import { LoginApiResponse } from "./externalAuth.types";
import { EXTERNAL_AUTH_API_URL } from "../../config/env";

const apiClient = axios.create({
  baseURL: EXTERNAL_AUTH_API_URL,
  timeout: 15000, // increase timeout
  headers: {
    "Content-Type": "application/json",
    "Accept": "*/*",
  },
});

export const externalAuthClient = async (
  endpoint: string,
  payload: unknown
): Promise<LoginApiResponse> => {
  try {
    console.log("➡️ PAYLOAD:", payload);

    const response = await apiClient.post<LoginApiResponse>(
      endpoint,
      payload
    );

    console.log("✅ RESPONSE got");

    return response.data;
  } catch (error) {
    const err = error as AxiosError;

    console.log("❌ ERROR FULL:", err);

    if (err.response) {
      console.log("❌ API RESPONSE:", err.response.data);
      throw new Error("External API Error");
    }

    if (err.request) {
      console.log("❌ NO RESPONSE DETAILS:", err.request);
      throw new Error("No response from auth server");
    }

    throw new Error(err.message);
  }
};