import axios from "axios";

// Shared axios instance for all DarshanEase API calls.
// No interceptors yet (token interceptor belongs to USN-2).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export default api;
