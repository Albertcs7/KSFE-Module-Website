import axios, { AxiosError } from "axios";
import { EXTERNAL_AUTH_API_URL } from "../../config/env";
import { logger } from "../../core/logger/logger";
import { LoginApiResponse } from "./externalAuth.types";

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
    logger.info("Calling external auth API", { endpoint });

    const response = await apiClient.post<LoginApiResponse>(endpoint, payload);

    logger.info("External auth response received", { endpoint, status: response.status });

    return response.data;
  } catch (error) {
    const err = error as AxiosError;

    logger.error("External auth client error", { endpoint, message: err.message });

    if (err.response) {
      logger.warn("External auth API returned error", { status: err.response.status });
      throw new Error("External API Error");
    }

    if (err.request) {
      logger.warn("No response from auth server", { endpoint });
      throw new Error("No response from auth server");
    }

    throw new Error(err.message);
  }
};