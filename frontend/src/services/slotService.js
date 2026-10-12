import api from "./api";

// GET /slots — PUBLIC. Optional date (YYYY-MM-DD), templeId and q (temple name, city or offering) filters.
// Only params with a value are sent; the server applies its defaults otherwise.
// Returns response.data ({ success, message, data:{ count, slots } }).
export async function getSlots(params = {}, signal) {
  const query = {};
  if (params.date) query.date = params.date;
  if (params.templeId) query.templeId = params.templeId;
  if (params.q) query.q = params.q;
  const response = await api.get("/slots", { params: query, signal });
  return response.data;
}

// GET /temples — PUBLIC. Feeds the temple dropdown.
// Returns response.data ({ success, message, data:{ temples } }).
export async function getTemples(signal) {
  const response = await api.get("/temples", { signal });
  return response.data;
}

// GET /slots/:id — PUBLIC. Single slot for the booking page.
// Returns response.data ({ success, message, data:{ slot } }).
export async function getSlotById(id, signal) {
  const response = await api.get(`/slots/${id}`, { signal });
  return response.data;
}

// GET /temples/:id — PUBLIC. Temple details plus its upcoming slots.
// Returns response.data ({ success, message, data:{ temple, slots } }).
export async function getTempleById(id, signal) {
  const response = await api.get(`/temples/${id}`, { signal });
  return response.data;
}
