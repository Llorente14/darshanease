const Booking = require("../models/Booking");
const DarshanSlot = require("../models/DarshanSlot");
const { getSlotStatus } = require("../utils/dateTime");
const { reserveSeats, releaseSeats } = require("./seatService");

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

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

  return Booking.findById(booking._id)
    .populate({
      path: "slot",
      select: "date startTime endTime price temple",
      populate: { path: "temple", select: "templeName location" },
    })
    .lean();
};

module.exports = { createBooking };
