// Display code only (e.g. "DE-1A2B3C4D"). Not stored in the DB; lookups still use _id.
// Reused by the confirmation email (USN-7).
const toBookingCode = (id) => "DE-" + String(id).slice(-8).toUpperCase();

module.exports = { toBookingCode };
