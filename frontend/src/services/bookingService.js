import api from "./api";

// POST /bookings — requires Bearer token (attached by api.js). totalAmount is never sent:
// the server computes it from the slot price.
// Returns response.data ({ success, message, data:{ booking } }).
export async function createBooking({ slotId, numberOfDevotees }) {
  const response = await api.post("/bookings", { slotId, numberOfDevotees });
  return response.data;
}
