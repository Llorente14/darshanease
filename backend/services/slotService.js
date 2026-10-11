const DarshanSlot = require("../models/DarshanSlot");
const { getTodayWIB, dateStringToUTCDate, getSlotStatus } = require("../utils/dateTime");

const SLOT_SELECT = "date startTime endTime availableSeats price temple";
const TEMPLE_SELECT = "templeName location darshanStartTime darshanEndTime";

// Shared response shape for GET /slots and GET /slots/:id
const toSlotDTO = (s, now) => ({
  _id: s._id,
  date: s.date.toISOString().slice(0, 10),
  startTime: s.startTime,
  endTime: s.endTime,
  availableSeats: s.availableSeats,
  price: s.price,
  status: getSlotStatus(s, now),
  temple: s.temple,
});

const listSlots = async ({ date, templeId } = {}) => {
  const filter = {};
  filter.date = date
    ? dateStringToUTCDate(date)
    : { $gte: dateStringToUTCDate(getTodayWIB()) };
  if (templeId) filter.temple = templeId;

  const slots = await DarshanSlot.find(filter)
    .select(SLOT_SELECT)
    .populate("temple", TEMPLE_SELECT)
    .sort({ date: 1, startTime: 1 })
    .lean();

  const now = new Date();
  return slots
    .map((s) => toSlotDTO(s, now))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.temple.templeName.localeCompare(b.temple.templeName)
    );
};

const getSlotById = async (id) => {
  const slot = await DarshanSlot.findById(id)
    .select(SLOT_SELECT)
    .populate("temple", TEMPLE_SELECT)
    .lean();

  if (!slot) {
    const err = new Error("Slot not found");
    err.statusCode = 404;
    throw err;
  }

  return toSlotDTO(slot, new Date());
};

module.exports = { listSlots, getSlotById };
