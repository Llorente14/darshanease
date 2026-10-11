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
