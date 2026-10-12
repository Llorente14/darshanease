import api from "./api";

// All admin endpoints need a Bearer token with role "admin" (attached by api.js).
// A deactivated account gets 401 from any protected request, which signs the user out.

// GET /admin/users — newest first, capped at 500 by the server. Returns response.data ({ data:{ users } }).
export async function getUsers(signal) {
  const response = await api.get("/admin/users", { signal });
  return response.data;
}

// PATCH /admin/users/:id — body { role?, isActive? }. 400 when the admin targets their own account.
// Returns response.data ({ data:{ user } }).
export async function updateUser(id, payload) {
  const response = await api.patch(`/admin/users/${id}`, payload);
  return response.data;
}

// GET /admin/reports — aggregated numbers for the reports tab. Returns response.data ({ data:{ summary, ... } }).
export async function getReports(signal) {
  const response = await api.get("/admin/reports", { signal });
  return response.data;
}
