const Booking = require("../models/Booking");
const DarshanSlot = require("../models/DarshanSlot");
const User = require("../models/User");
const { getSlotStatus } = require("../utils/dateTime");
const { toBookingCode } = require("../utils/bookingCode");
const {
  canChangeBooking,
  CHANGE_NOT_ALLOWED_MESSAGE,
  PAYMENT_TIMEOUT_MINUTES,
} = require("../utils/bookingPolicy");
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
  // Older bookings (.lean(), no schema defaults) have no donationAmount stored
  donationAmount: booking.donationAmount ?? 0,
  bookingDate: booking.bookingDate,
  // Sprint 1 bookings have no status stored; .lean() skips schema defaults, so fall back here
  status: booking.status || "confirmed",
  // Frontend reads this flag instead of repeating the cutoff rule
  canChange: canChangeBooking(booking),
  // Only pending bookings need a Snap popup. The frontend opens it with snapToken.
  payment:
    booking.status === "pending" ? { snapToken: booking.snapToken, expiresAt: booking.paymentExpiresAt } : null,
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
const createBooking = async ({ userId, slotId, numberOfDevotees, donationAmount = 0 }) => {
  const slot = await DarshanSlot.findById(slotId).lean();
  if (!slot) throw httpError(404, "Slot not found");

  if (getSlotStatus(slot) === "expired") {
    throw httpError(400, "This darshan slot has already ended");
  }

  const reserved = await reserveSeats(slotId, numberOfDevotees);
  if (!reserved) throw httpError(409, "Not enough seats available");

  // totalAmount = price x devotees + donation, always computed on the server
  const totalAmount = reserved.price * numberOfDevotees + donationAmount;

  // Free bookings are confirmed at once. Paid bookings wait until Midtrans reports the payment.
  const status = totalAmount > 0 ? "pending" : "confirmed";
  const paymentExpiresAt =
    status === "pending" ? new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000) : undefined;

  let booking;
  try {
    booking = await Booking.create({
      user: userId,
      slot: slotId,
      numberOfDevotees,
      donationAmount,
      totalAmount,
      status,
      paymentExpiresAt,
    });
  } catch (err) {
    // Roll back the seats. Log a failed rollback but rethrow the original error.
    await releaseSeats(slotId, numberOfDevotees).catch((rollbackErr) =>
      console.error("Seat rollback failed:", rollbackErr.message)
    );
    throw err;
  }

  if (status === "pending") {
    // Required here, not at the top: paymentService requires this file, so a top-level require would loop
    const { createSnapTransaction, failPendingBooking } = require("./paymentService");
    const user = await User.findById(userId).lean();
    try {
      const { token } = await createSnapTransaction({ booking, user });
      await Booking.updateOne({ _id: booking._id }, { $set: { snapToken: token } });
    } catch (err) {
      // No payment page for the user, so the booking cannot be paid. Free the seats now.
      await failPendingBooking(booking._id);
      throw httpError(502, "Payment service is unavailable. Please try again.");
    }
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

// Changes the number of devotees and moves the seat difference. No transaction: the atomic seat
// operations plus the optimistic lock below are the guard.
const modifyBooking = async ({ bookingId, userId, numberOfDevotees }) => {
  const booking = await getBookingForUser({ bookingId, userId });
  assertChangeable(booking);

  const oldCount = booking.numberOfDevotees;
  if (numberOfDevotees === oldCount) throw httpError(400, "Number of devotees is unchanged");

  const diff = numberOfDevotees - oldCount;
  const slotId = booking.slot._id;
  // Price always comes from the database, never from the request.
  // The donation stays as it was; only the ticket part changes.
  const totalAmount = booking.slot.price * numberOfDevotees + (booking.donationAmount ?? 0);

  // Optimistic lock: the update only matches while the count is still the one we read.
  // Two concurrent modifies cannot both apply their seat difference.
  const filter = { _id: bookingId, user: userId, numberOfDevotees: oldCount, ...ACTIVE_FILTER };
  const update = { $set: { numberOfDevotees, totalAmount } };
  const options = { returnDocument: "after", runValidators: true };
  const changedElsewhere = () =>
    httpError(409, "Booking was changed elsewhere, please refresh and try again");

  if (diff > 0) {
    // Reserve the extra seats first; give them back if the booking update does not go through
    const reserved = await reserveSeats(slotId, diff);
    if (!reserved) throw httpError(409, "Not enough seats available");

    let updated;
    try {
      updated = await Booking.findOneAndUpdate(filter, update, options);
    } catch (err) {
      await releaseSeats(slotId, diff).catch(logReleaseFailure("modify rollback"));
      throw err;
    }
    if (!updated) {
      await releaseSeats(slotId, diff).catch(logReleaseFailure("modify rollback"));
      throw changedElsewhere();
    }
  } else {
    // Fewer devotees: release only after the booking update has gone through
    const updated = await Booking.findOneAndUpdate(filter, update, options);
    if (!updated) throw changedElsewhere();
    await releaseSeats(slotId, -diff).catch(logReleaseFailure("modify"));
  }

  return Booking.findById(bookingId).populate(SLOT_POPULATE).lean();
};

module.exports = {
  SLOT_POPULATE,
  createBooking,
  getBookingForUser,
  listBookingsForUser,
  cancelBooking,
  modifyBooking,
  toBookingDTO,
};
