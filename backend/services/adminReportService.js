const Booking = require("../models/Booking");
const DarshanSlot = require("../models/DarshanSlot");
const Temple = require("../models/Temple");
const User = require("../models/User");
const { getTodayWIB, addDaysToDateString } = require("../utils/dateTime");

// Booking documents from before the status field was added have no status stored.
// They count as confirmed, the same rule as the booking list (see bookingService).
const CONFIRMED = { $or: [{ status: "confirmed" }, { status: { $exists: false } }] };
const EFFECTIVE_STATUS = { $ifNull: ["$status", "confirmed"] };

const ROLES = ["devotee", "organizer", "admin"];
const REPORT_DAYS = 14;
const TOP_TEMPLES = 5;
const TOP_LOCATIONS = 8;

// Revenue and donations count confirmed bookings only. Cancelled and failed bookings are not income.
const getConfirmedTotals = async () => {
  const [row] = await Booking.aggregate([
    { $match: CONFIRMED },
    {
      $group: {
        _id: null,
        confirmedBookings: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
        totalDonations: { $sum: { $ifNull: ["$donationAmount", 0] } },
        devoteesServed: { $sum: "$numberOfDevotees" },
      },
    },
  ]);
  return {
    confirmedBookings: row?.confirmedBookings ?? 0,
    totalRevenue: row?.totalRevenue ?? 0,
    totalDonations: row?.totalDonations ?? 0,
    devoteesServed: row?.devoteesServed ?? 0,
  };
};

const getTotalBookings = () => Booking.countDocuments({});

const getBookingsByStatus = async () => {
  const rows = await Booking.aggregate([
    { $group: { _id: EFFECTIVE_STATUS, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row) => ({ status: row._id, count: row.count }));
};

// The last 14 WIB days, oldest first, ending today. Days without bookings are returned with zeros.
const getDailyBookings = async (today) => {
  const firstDay = addDaysToDateString(today, -(REPORT_DAYS - 1));
  const start = new Date(`${firstDay}T00:00:00+07:00`);

  const rows = await Booking.aggregate([
    { $match: { bookingDate: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate", timezone: "Asia/Jakarta" } },
        bookings: { $sum: 1 },
        revenue: {
          $sum: { $cond: [{ $in: [EFFECTIVE_STATUS, ["confirmed"]] }, "$totalAmount", 0] },
        },
      },
    },
  ]);

  const byDate = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: REPORT_DAYS }, (_, index) => {
    const date = addDaysToDateString(firstDay, index);
    const row = byDate.get(date);
    return { date, bookings: row?.bookings ?? 0, revenue: row?.revenue ?? 0 };
  });
};

// Confirmed bookings grouped by temple. Collection names come from the models, not typed by hand.
const getTopTemples = async () => {
  const rows = await Booking.aggregate([
    { $match: CONFIRMED },
    {
      $lookup: {
        from: DarshanSlot.collection.name,
        localField: "slot",
        foreignField: "_id",
        as: "slot",
      },
    },
    { $unwind: "$slot" },
    {
      $group: {
        _id: "$slot.temple",
        bookings: { $sum: 1 },
        devotees: { $sum: "$numberOfDevotees" },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { devotees: -1, bookings: -1 } },
    { $limit: TOP_TEMPLES },
    {
      $lookup: {
        from: Temple.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "temple",
      },
    },
    { $unwind: "$temple" },
    {
      $project: {
        _id: 0,
        templeId: "$_id",
        templeName: "$temple.templeName",
        location: "$temple.location",
        bookings: 1,
        devotees: 1,
        revenue: 1,
      },
    },
  ]);
  return rows;
};

const getUsersByRole = async () => {
  const rows = await User.aggregate([
    { $group: { _id: { $ifNull: ["$role", "devotee"] }, count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return ROLES.map((role) => ({ role, count: counts.get(role) ?? 0 }));
};

// Heuristic only: the address is free text, so the last comma-separated part is taken as the location.
// "Jl. Melati 5, Bogor" -> "Bogor". Matching ignores case; the first spelling seen is shown.
const getTopLocations = async () => {
  const devotees = await User.find({ role: "devotee" }).select("address").lean();

  const byKey = new Map();
  for (const devotee of devotees) {
    const parts = String(devotee.address ?? "").split(",");
    const label = (parts[parts.length - 1] || "").trim() || "Unknown";
    const key = label.toLowerCase();
    const entry = byKey.get(key) ?? { location: label, users: 0 };
    entry.users += 1;
    byKey.set(key, entry);
  }

  return [...byKey.values()].sort((a, b) => b.users - a.users).slice(0, TOP_LOCATIONS);
};

// Read-only: every query here is an aggregation, a count or a find. Nothing is written.
const getReports = async () => {
  const today = getTodayWIB();

  const [
    totals,
    totalBookings,
    bookingsByStatus,
    dailyBookings,
    topTemples,
    usersByRole,
    activeUsers,
    inactiveUsers,
    topLocations,
  ] = await Promise.all([
    getConfirmedTotals(),
    getTotalBookings(),
    getBookingsByStatus(),
    getDailyBookings(today),
    getTopTemples(),
    getUsersByRole(),
    User.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ isActive: false }),
    getTopLocations(),
  ]);

  return {
    summary: {
      totalBookings,
      confirmedBookings: totals.confirmedBookings,
      totalRevenue: totals.totalRevenue,
      totalDonations: totals.totalDonations,
      devoteesServed: totals.devoteesServed,
      activeUsers,
      inactiveUsers,
    },
    bookingsByStatus,
    dailyBookings,
    topTemples,
    usersByRole,
    topLocations,
  };
};

module.exports = { getReports };
