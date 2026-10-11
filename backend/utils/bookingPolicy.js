// Global booking change rule. Temple has no per-temple policy field, so one rule applies to all temples.
// Change CHANGE_CUTOFF_HOURS here to adjust the window.
const CHANGE_CUTOFF_HOURS = 24;

const MAX_DONATION_IDR = 10000000; // upper bound for a donation per booking (Rp 10.000.000)

const CHANGE_NOT_ALLOWED_MESSAGE = `Bookings can only be changed up to ${CHANGE_CUTOFF_HOURS} hours before the darshan starts`;

// date: Date (stored at 00:00Z of the WIB calendar date) or "YYYY-MM-DD"; startTime: "HH:mm" WIB
const getSlotStart = (date, startTime) => {
  const dateStr = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return new Date(`${dateStr}T${startTime}:00+07:00`);
};

// Cancel and modify are allowed only while the booking is active and the darshan starts far enough away
const canChangeBooking = (booking, now = new Date()) => {
  if ((booking.status || "confirmed") !== "confirmed") return false;
  const msUntilStart = getSlotStart(booking.slot.date, booking.slot.startTime).getTime() - now.getTime();
  return msUntilStart >= CHANGE_CUTOFF_HOURS * 3600 * 1000;
};

module.exports = { CHANGE_CUTOFF_HOURS, MAX_DONATION_IDR, CHANGE_NOT_ALLOWED_MESSAGE, getSlotStart, canChangeBooking };
