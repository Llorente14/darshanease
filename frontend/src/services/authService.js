import api from "./api";

// POST /auth/register — returns response.data ({ success, message, data:{ user, token } })
export async function register(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}
