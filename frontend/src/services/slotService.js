import api from "./api";

// GET /slots — PUBLIC. Optional date (YYYY-MM-DD) and templeId filters.
// Only params with a value are sent; the server applies its defaults otherwise.
// Returns response.data ({ success, message, data:{ count, slots } }).
export async function getSlots(params = {}, signal) {
  const query = {};
  if (params.date) query.date = params.date;
  if (params.templeId) query.templeId = params.templeId;
  const response = await api.get("/slots", { params: query, signal });
  return response.data;
}

// GET /temples — PUBLIC. Feeds the temple dropdown.
// Returns response.data ({ success, message, data:{ temples } }).
export async function getTemples(signal) {
  const response = await api.get("/temples", { signal });
  return response.data;
}
