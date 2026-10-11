const DarshanSlot = require("../models/DarshanSlot");
const Temple = require("../models/Temple");
const Booking = require("../models/Booking");
const { getTodayWIB, dateStringToUTCDate, getSlotStatus } = require("../utils/dateTime");
const { toBookingCode } = require("../utils/bookingCode");
const { emitSlotUpdated } = require("../config/socket");

// Sprint 1 bookings may have no status stored; $nin also matches a missing field, which counts as active
const ACTIVE_BOOKING = { status: { $nin: ["cancelled", "failed"] } };

const DUPLICATE_MESSAGE = "A slot for this temple already starts at this date and time";

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toDateString = (date) => date.toISOString().slice(0, 10);

// Date strings are YYYY-MM-DD, so a plain string comparison matches calendar order
const assertNotPast = (dateStr) => {
  if (dateStr < getTodayWIB()) throw httpError(400, "Date cannot be in the past");
};

// Times are HH:mm strings, so string comparison matches clock order
const assertSlotTimes = (temple, startTime, endTime) => {
  if (endTime <= startTime) throw httpError(400, "endTime must be later than startTime");
  if (startTime < temple.darshanStartTime || endTime > temple.darshanEndTime) {
    throw httpError(
      400,
      `Slot must be within the temple's darshan hours (${temple.darshanStartTime} - ${temple.darshanEndTime})`
    );
  }
};

// Counts active bookings and booked devotees per slot. Slot ids must be ObjectIds (aggregate does not cast).
const getBookingStats = async (slotIds) => {
  const rows = await Booking.aggregate([
    { $match: { slot: { $in: slotIds }, ...ACTIVE_BOOKING } },
    {
      $group: {
        _id: "$slot",
        activeBookings: { $sum: 1 },
        bookedDevotees: { $sum: "$numberOfDevotees" },
      },
    },
  ]);
  return new Map(
    rows.map((row) => [
      String(row._id),
      { activeBookings: row.activeBookings, bookedDevotees: row.bookedDevotees },
    ])
  );
};

const toOrganizerSlotDTO = (slot, temple, stats, now = new Date()) => ({
  _id: slot._id,
  date: toDateString(slot.date),
  startTime: slot.startTime,
  endTime: slot.endTime,
  availableSeats: slot.availableSeats,
  price: slot.price,
  status: getSlotStatus(slot, now),
  temple: { _id: temple._id, templeName: temple.templeName },
  activeBookings: stats?.activeBookings ?? 0,
  bookedDevotees: stats?.bookedDevotees ?? 0,
});

// Missing slot and slot of another organizer's temple both return 404, so ids cannot be probed
const loadOwnedSlot = async ({ id, userId }) => {
  const slot = await DarshanSlot.findById(id).lean();
  const temple =
    slot &&
    (await Temple.findOne({ _id: slot.temple, organizer: userId })
      .select("templeName darshanStartTime darshanEndTime")
      .lean());
  if (!slot || !temple) throw httpError(404, "Slot not found");
  return { slot, temple };
};

const listOrganizerSlots = async ({ userId, templeId }) => {
  const temples = await Temple.find({ organizer: userId })
    .select("templeName darshanStartTime darshanEndTime")
    .lean();
  if (templeId && !temples.some((temple) => String(temple._id) === templeId)) {
    throw httpError(404, "Temple not found");
  }

  const templeById = new Map(temples.map((temple) => [String(temple._id), temple]));
  const slots = await DarshanSlot.find({
    temple: templeId ?? { $in: temples.map((temple) => temple._id) },
    date: { $gte: dateStringToUTCDate(getTodayWIB()) },
  })
    .sort({ date: 1, startTime: 1 })
    .lean();

  const stats = await getBookingStats(slots.map((slot) => slot._id));
  const now = new Date();
  return slots.map((slot) =>
    toOrganizerSlotDTO(slot, templeById.get(String(slot.temple)), stats.get(String(slot._id)), now)
  );
};

const createOrganizerSlot = async ({ userId, input }) => {
  const { templeId, date, startTime, endTime, availableSeats, price } = input;

  const temple = await Temple.findOne({ _id: templeId, organizer: userId })
    .select("templeName darshanStartTime darshanEndTime")
    .lean();
  if (!temple) throw httpError(404, "Temple not found");

  assertNotPast(date);
  assertSlotTimes(temple, startTime, endTime);

  let slot;
  try {
    slot = await DarshanSlot.create({
      temple: templeId,
      date: dateStringToUTCDate(date),
      startTime,
      endTime,
      availableSeats,
      price,
    });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, DUPLICATE_MESSAGE);
    throw err;
  }

  return toOrganizerSlotDTO(slot.toObject(), temple, null, new Date());
};

// Editing the schedule or price is blocked while active bookings exist. Only availableSeats may change then.
const updateOrganizerSlot = async ({ id, userId, input }) => {
  const { slot, temple } = await loadOwnedSlot({ id, userId });
  const now = new Date();
  if (getSlotStatus(slot, now) === "expired") throw httpError(400, "Past slots cannot be edited");

  const { date, startTime, endTime, availableSeats, price } = input;
  const scheduleChanged =
    date !== toDateString(slot.date) ||
    startTime !== slot.startTime ||
    endTime !== slot.endTime ||
    price !== slot.price;

  if (scheduleChanged) {
    const activeCount = await Booking.countDocuments({ slot: id, ...ACTIVE_BOOKING });
    if (activeCount > 0) {
      throw httpError(409, "This slot has active bookings. Only available seats can be changed.");
    }
    assertNotPast(date);
    assertSlotTimes(temple, startTime, endTime);
  }

  // Optimistic lock: the update only matches while the seat count is the one we read.
  // This keeps the edit from overwriting a booking that was made at the same time.
  let updated;
  try {
    updated = await DarshanSlot.findOneAndUpdate(
      { _id: id, availableSeats: slot.availableSeats },
      { $set: { date: dateStringToUTCDate(date), startTime, endTime, availableSeats, price } },
      { returnDocument: "after", runValidators: true }
    );
  } catch (err) {
    if (err.code === 11000) throw httpError(409, DUPLICATE_MESSAGE);
    throw err;
  }
  if (!updated) throw httpError(409, "Seats changed while saving. Refresh and try again.");

  if (updated.availableSeats !== slot.availableSeats) {
    try {
      emitSlotUpdated(updated);
    } catch (err) {
      console.error("slot:updated emit failed:", err.message);
    }
  }

  const stats = await getBookingStats([slot._id]);
  return toOrganizerSlotDTO(updated.toObject(), temple, stats.get(String(slot._id)), new Date());
};

// A slot with any booking (including cancelled) is kept, so booking history stays linked to a real slot
const deleteOrganizerSlot = async ({ id, userId }) => {
  const { slot } = await loadOwnedSlot({ id, userId });

  const bookingCount = await Booking.countDocuments({ slot: id });
  if (bookingCount > 0) {
    throw httpError(
      409,
      "This slot has bookings and cannot be deleted. Set available seats to 0 to stop new bookings."
    );
  }

  // The seat count filter stops the delete when a booking reserved seats after the check above
  const result = await DarshanSlot.deleteOne({ _id: id, availableSeats: slot.availableSeats });
  if (result.deletedCount === 0) {
    throw httpError(409, "Slot changed while deleting. Refresh and try again.");
  }
};

const listSlotBookings = async ({ id, userId }) => {
  const { slot, temple } = await loadOwnedSlot({ id, userId });

  const bookings = await Booking.find({ slot: id })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 })
    .lean();

  const stats = await getBookingStats([slot._id]);
  return {
    slot: toOrganizerSlotDTO(slot, temple, stats.get(String(slot._id)), new Date()),
    bookings: bookings.map((booking) => ({
      _id: booking._id,
      bookingCode: toBookingCode(booking._id),
      status: booking.status || "confirmed",
      numberOfDevotees: booking.numberOfDevotees,
      donationAmount: booking.donationAmount ?? 0,
      totalAmount: booking.totalAmount,
      bookingDate: booking.bookingDate,
      user: booking.user
        ? { name: booking.user.name, email: booking.user.email, phone: booking.user.phone }
        : null,
    })),
  };
};

module.exports = {
  listOrganizerSlots,
  createOrganizerSlot,
  updateOrganizerSlot,
  deleteOrganizerSlot,
  listSlotBookings,
};
