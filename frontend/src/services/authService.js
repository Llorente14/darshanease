import api from "./api";

// POST /auth/register — returns response.data ({ success, message, data:{ user, token } })
export async function register(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

// POST /auth/login — returns response.data ({ success, message, data:{ user, token } })
export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

// GET /auth/me — returns response.data ({ success, message, data:{ user } })
export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}
