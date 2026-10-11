import api from "./api";

// POST /bookings — requires Bearer token (attached by api.js). totalAmount is never sent:
// the server computes it from the slot price.
// Returns response.data ({ success, message, data:{ booking } }).
export async function createBooking({ slotId, numberOfDevotees }) {
  const response = await api.post("/bookings", { slotId, numberOfDevotees });
  return response.data;
}

// GET /bookings/:id — owner only (Bearer token). 404 when missing or owned by someone else.
// Returns response.data ({ success, message, data:{ booking } }) with qrCode included.
export async function getBookingById(id, signal) {
  const response = await api.get(`/bookings/${id}`, { signal });
  return response.data;
}

// GET /bookings/me — the signed-in user's bookings, already split and sorted by the server.
// Returns response.data ({ success, message, data:{ upcoming, past, count } }).
export async function getMyBookings(signal) {
  const response = await api.get("/bookings/me", { signal });
  return response.data;
}

// PATCH /bookings/:id/cancel — owner only. The server decides whether the booking is still changeable.
// Returns response.data ({ success, message, data:{ booking } }).
export async function cancelBooking(id) {
  const response = await api.patch(`/bookings/${id}/cancel`);
  return response.data;
}

// PATCH /bookings/:id — changes the number of devotees. totalAmount is never sent:
// the server recalculates it from the slot price.
// Returns response.data ({ success, message, data:{ booking } }).
export async function modifyBooking(id, numberOfDevotees) {
  const response = await api.patch(`/bookings/${id}`, { numberOfDevotees });
  return response.data;
}
