// Display formatters for darshan slots.
// Dates from the API are "YYYY-MM-DD" strings. Never pass them to new Date(str):
// that parses as UTC and can shift the day in western timezones.

const DATE_LOCALE = "en-US"; // matches the reference UI copy (English)

const dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat(DATE_LOCALE, { weekday: "short" });

const monthFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
  month: "short",
  year: "numeric",
});

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// "2026-10-12" -> local Date at midnight (built from parts, no UTC shift)
function parseSlotDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "2026-10-12" -> "Monday, October 12, 2026"
export function formatSlotDate(dateString) {
  if (!dateString) return "";
  return dateFormatter.format(parseSlotDate(dateString));
}

// "2026-10-12" -> { weekday: "Mon", day: "12", month: "Oct 2026" } for the date block
export function formatSlotDateParts(dateString) {
  const date = parseSlotDate(dateString);
  return {
    weekday: weekdayFormatter.format(date),
    day: String(date.getDate()),
    month: monthFormatter.format(date),
  };
}

// ("06:00", "08:00") -> "06:00 - 08:00 WIB"
export function formatTimeRange(startTime, endTime) {
  return `${startTime} - ${endTime} WIB`;
}

// 150000 -> "Rp 150.000"
export function formatPrice(amount) {
  return priceFormatter.format(amount);
}

// 0 -> "No seats left", 1 -> "1 seat left", 12 -> "12 seats left"
export function formatSeatsLeft(availableSeats) {
  if (availableSeats <= 0) return "No seats left";
  return availableSeats === 1
    ? "1 seat left"
    : `${availableSeats} seats left`;
}
