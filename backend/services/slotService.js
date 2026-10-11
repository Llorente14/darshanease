const DarshanSlot = require("../models/DarshanSlot");
const { getTodayWIB, dateStringToUTCDate, getSlotStatus } = require("../utils/dateTime");

const listSlots = async ({ date, templeId } = {}) => {
  const filter = {};
  filter.date = date
    ? dateStringToUTCDate(date)
    : { $gte: dateStringToUTCDate(getTodayWIB()) };
  if (templeId) filter.temple = templeId;

  const slots = await DarshanSlot.find(filter)
    .select("date startTime endTime availableSeats price temple")
    .populate("temple", "templeName location darshanStartTime darshanEndTime")
    .sort({ date: 1, startTime: 1 })
    .lean();

  const now = new Date();
  return slots
    .map((s) => ({
      _id: s._id,
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      availableSeats: s.availableSeats,
      price: s.price,
      status: getSlotStatus(s, now),
      temple: s.temple,
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.temple.templeName.localeCompare(b.temple.templeName)
    );
};

module.exports = { listSlots };