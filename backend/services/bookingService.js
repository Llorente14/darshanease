const Booking = require("../models/Booking");
const DarshanSlot = require("../models/DarshanSlot");
const { getSlotStatus } = require("../utils/dateTime");
const { toBookingCode } = require("../utils/bookingCode");
const { canChangeBooking, CHANGE_NOT_ALLOWED_MESSAGE } = require("../utils/bookingPolicy");
const { reserveSeats, releaseSeats } = require("./seatService");

const SLOT_POPULATE = {
  path: "slot",
  select: "date startTime endTime price temple",
  populate: { path: "temple", select: "templeName location" },
};

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Response shape for a booking. The date is formatted the same way as GET /slots.
const toBookingDTO = (booking) => ({
  _id: booking._id,
  bookingCode: toBookingCode(booking._id),
  numberOfDevotees: booking.numberOfDevotees,
  totalAmount: booking.totalAmount,
  bookingDate: booking.bookingDate,
  // Sprint 1 bookings have no status stored; .lean() skips schema defaults, so fall back here
  status: booking.status || "confirmed",
  // Frontend reads this flag instead of repeating the cutoff rule
  canChange: canChangeBooking(booking),
  slot: {
    _id: booking.slot._id,
    date: booking.slot.date.toISOString().slice(0, 10),
    startTime: booking.slot.startTime,
    endTime: booking.slot.endTime,
    price: booking.slot.price,
    temple: {
      templeName: booking.slot.temple.templeName,
      location: booking.slot.temple.location,
    },
  },
});

// Order matters: lookup, expiry check, atomic seat reservation, price from DB, create.
// If Booking.create fails after seats were taken, the seats are released again.
// No Mongo transaction: the atomic $inc in reserveSeats plus the rollback covers this scope.
const createBooking = async ({ userId, slotId, numberOfDevotees }) => {
  const slot = await DarshanSlot.findById(slotId).lean();
  if (!slot) throw httpError(404, "Slot not found");

  if (getSlotStatus(slot) === "expired") {
    throw httpError(400, "This darshan slot has already ended");
  }

  const reserved = await reserveSeats(slotId, numberOfDevotees);
  if (!reserved) throw httpError(409, "Not enough seats available");

  // Price always comes from the database, never from the request
  const totalAmount = reserved.price * numberOfDevotees;

  let booking;
  try {
    booking = await Booking.create({
      user: userId,
      slot: slotId,
      numberOfDevotees,
      totalAmount,
    });
  } catch (err) {
    // Roll back the seats. Log a failed rollback but rethrow the original error.
    await releaseSeats(slotId, numberOfDevotees).catch((rollbackErr) =>
      console.error("Seat rollback failed:", rollbackErr.message)
    );
    throw err;
  }

  return Booking.findById(booking._id).populate(SLOT_POPULATE).lean();
};

// Only the owner can read a booking. Another user's booking returns 404, not 403, so ids are not probed.
const getBookingForUser = async ({ bookingId, userId }) => {
  const booking = await Booking.findOne({ _id: bookingId, user: userId })
    .populate(SLOT_POPULATE)
    .lean();
  if (!booking) throw httpError(404, "Booking not found");
  return booking;
};

// Splits the user's bookings into upcoming and past. Cancelled/failed bookings always count as past.
// Each list is sorted by slot date, then start time: upcoming nearest first, past most recent first.
const listBookingsForUser = async (userId) => {
  const bookings = await Booking.find({ user: userId })
    .populate(SLOT_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  const upcoming = [];
  const past = [];

  for (const booking of bookings) {
    // Skip bookings whose slot or temple was deleted; the DTO needs both
    if (!booking.slot || !booking.slot.temple) continue;

    const dto = toBookingDTO(booking);
    const status = booking.status || "confirmed";
    const isPast =
      getSlotStatus(booking.slot, now) === "expired" || status === "cancelled" || status === "failed";
    (isPast ? past : upcoming).push(dto);
  }

  const bySlotTime = (a, b) =>
    a.slot.date.localeCompare(b.slot.date) || a.slot.startTime.localeCompare(b.slot.startTime);
  upcoming.sort(bySlotTime);
  past.sort((a, b) => bySlotTime(b, a));

  return { upcoming, past };
};

// Sprint 1 bookings have no status stored in the DB, so "active" also matches a missing field
const ACTIVE_FILTER = { $or: [{ status: "confirmed" }, { status: { $exists: false } }] };

const assertChangeable = (booking) => {
  if ((booking.status || "confirmed") !== "confirmed") {
    throw httpError(409, "Booking is no longer active");
  }
  if (!canChangeBooking(booking)) throw httpError(400, CHANGE_NOT_ALLOWED_MESSAGE);
};

const logReleaseFailure = (action) => (err) =>
  console.error(`Seat release failed after ${action}:`, err.message);

// The atomic status flip is what prevents double release: only one request can move a booking
// from active to cancelled, so its seats are released exactly once even if two cancels race.
const cancelBooking = async ({ bookingId, userId }) => {
  const booking = await getBookingForUser({ bookingId, userId });
  assertChangeable(booking);

  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, user: userId, ...ACTIVE_FILTER },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  );
  if (!updated) throw httpError(409, "Booking is already cancelled or no longer active");

  await releaseSeats(updated.slot, updated.numberOfDevotees).catch(logReleaseFailure("cancel"));

  return Booking.findById(bookingId).populate(SLOT_POPULATE).lean();
};

module.exports = {
  createBooking,
  getBookingForUser,
  listBookingsForUser,
  cancelBooking,
  toBookingDTO,
};
