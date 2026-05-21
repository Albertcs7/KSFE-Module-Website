import axios from "axios";

const getCookie = (name: string) => {
  if (typeof document === "undefined") return "";

  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) return "";

  return decodeURIComponent(match.split("=").slice(1).join("="));
};

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// A plain client used for refresh/logout calls to avoid interceptor loops
export const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

refreshClient.interceptors.request.use((config) => {
  const csrfToken = getCookie("XSRF-TOKEN");

  if (csrfToken) {
    config.headers = config.headers ?? {};
    config.headers["x-csrf-token"] = csrfToken;
  }

  return config;
});

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const csrfToken = getCookie("XSRF-TOKEN");

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing operations
    if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase() || "")) {
      config.headers["x-csrf-token"] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (global error handling)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config as any;
    const requestUrl = String(originalRequest?.url ?? "");
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      return refreshClient
        .post("/auth/refresh")
        .then((r) => {
          const newToken = r.data?.data?.token;

          if (newToken) {
            localStorage.setItem("token", newToken);
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          }

          return Promise.reject(error);
        })
        .catch(async (refreshError) => {
          try {
            // Attempt to clear server cookie
            await refreshClient.post("/auth/logout");
          } catch {}

          // Clear local auth and reload to reset store state
          localStorage.removeItem("token");
          localStorage.removeItem("auth_user");
          if (typeof window !== "undefined") {
            window.location.reload();
          }

          return Promise.reject(refreshError);
        });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;