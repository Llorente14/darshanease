import axios from "axios";

const TOKEN_KEY = "darshanease_token";

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Shared axios instance for all DarshanEase API calls.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor: attach Bearer token from localStorage when present
api.interceptors.request.use(
  (config) => {
    try {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      /* storage unavailable — proceed without token */
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 (except login & register), notify registered handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthRoute && typeof onUnauthorized === "function") {
      try {
        onUnauthorized();
      } catch {
        /* ignore handler errors */
      }
    }

    return Promise.reject(error);
  }
);

export default api;
