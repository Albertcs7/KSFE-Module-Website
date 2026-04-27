import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

// REQUEST INTERCEPTOR (future: attach token)
axiosInstance.interceptors.request.use(
  (config) => {
    // Example (we’ll use later):
    // const token = localStorage.getItem("token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (global error handling)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example future handling:
    // if (error.response?.status === 401) logout()

    return Promise.reject(error);
  }
);

export default axiosInstance;