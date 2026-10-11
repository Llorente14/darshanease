import api from "./api";

// All organizer endpoints need a Bearer token with role "organizer" (attached by api.js).
// Only the organizer's own temples are returned. Another organizer's temple returns 404.

// GET /organizer/temples — returns response.data ({ success, message, data:{ temples } }).
export async function getMyTemples(signal) {
  const response = await api.get("/organizer/temples", { signal });
  return response.data;
}

// POST /organizer/temples — payload is the full temple body. Returns response.data ({ data:{ temple } }).
export async function createMyTemple(payload) {
  const response = await api.post("/organizer/temples", payload);
  return response.data;
}

// PUT /organizer/temples/:id — replaces the temple with the full body (same shape as POST).
export async function updateMyTemple(id, payload) {
  const response = await api.put(`/organizer/temples/${id}`, payload);
  return response.data;
}

// DELETE /organizer/temples/:id — 409 when the temple still has darshan slots.
export async function deleteMyTemple(id) {
  const response = await api.delete(`/organizer/temples/${id}`);
  return response.data;
}
