const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const getTodayWIB = () => new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);

const dateStringToUTCDate = (str) => new Date(`${str}T00:00:00.000Z`);

const addDaysToDateString = (str, n) => {
  const d = dateStringToUTCDate(str);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// date: Date | "YYYY-MM-DD"
const getSlotStatus = ({ date, endTime, availableSeats }, now = new Date()) => {
  const dateStr = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const end = new Date(`${dateStr}T${endTime}:00+07:00`);
  if (now > end) return "expired";
  if (availableSeats <= 0) return "full";
  return "available";
};

module.exports = { getTodayWIB, dateStringToUTCDate, addDaysToDateString, getSlotStatus };