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

// GET /organizer/slots?templeId= — today onward, sorted by the server. templeId is sent only when given.
export async function getMySlots({ templeId } = {}, signal) {
  const response = await api.get("/organizer/slots", {
    params: templeId ? { templeId } : undefined,
    signal,
  });
  return response.data;
}

// POST /organizer/slots — body includes templeId. Returns response.data ({ data:{ slot } }).
export async function createMySlot(payload) {
  const response = await api.post("/organizer/slots", payload);
  return response.data;
}

// PUT /organizer/slots/:id — body has no templeId (a slot cannot move to another temple).
// The server only allows changing availableSeats while the slot has active bookings.
export async function updateMySlot(id, payload) {
  const response = await api.put(`/organizer/slots/${id}`, payload);
  return response.data;
}

// DELETE /organizer/slots/:id — 409 when the slot has any booking.
export async function deleteMySlot(id) {
  const response = await api.delete(`/organizer/slots/${id}`);
  return response.data;
}

// GET /organizer/slots/:id/bookings — returns response.data ({ data:{ slot, bookings } }).
export async function getSlotBookings(id, signal) {
  const response = await api.get(`/organizer/slots/${id}/bookings`, { signal });
  return response.data;
}
