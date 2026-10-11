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

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// "2026-10-12" -> "Monday, October 12, 2026" (local date built from parts)
export function formatSlotDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
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
