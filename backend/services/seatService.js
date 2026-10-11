const DarshanSlot = require("../models/DarshanSlot");
const { emitSlotUpdated } = require("../config/socket");

// Dipanggil oleh booking service (USN-5) untuk reserve seat.
// releaseSeats dipakai untuk rollback booking (USN-5) dan pembatalan (USN-9); keduanya memakai emitSlotUpdated.

// The seat change is already committed when this runs, so a broadcast failure must not throw
// and cost the caller a booking (it would leak the seat). Log it and move on.
const notifySlotUpdated = (slot) => {
  try {
    emitSlotUpdated(slot);
  } catch (err) {
    console.error("slot:updated emit failed:", err.message);
  }
};

// Atomic: the filter only matches when enough seats remain, so two concurrent bookings
// can never drive availableSeats below 0. Returns null when the slot is missing or short on seats.
const reserveSeats = async (slotId, qty) => {
  const updatedSlot = await DarshanSlot.findOneAndUpdate(
    { _id: slotId, availableSeats: { $gte: qty } },
    { $inc: { availableSeats: -qty } },
    { returnDocument: "after" }
  );

  if (!updatedSlot) return null;

  notifySlotUpdated(updatedSlot);
  return updatedSlot;
};

// Atomic seat release. Returns null when the slot does not exist.
const releaseSeats = async (slotId, qty) => {
  const updatedSlot = await DarshanSlot.findByIdAndUpdate(
    slotId,
    { $inc: { availableSeats: qty } },
    { returnDocument: "after" }
  );

  if (!updatedSlot) return null;

  notifySlotUpdated(updatedSlot);
  return updatedSlot;
};

module.exports = { reserveSeats, releaseSeats };
