require("dotenv").config();
const mongoose = require("mongoose");
const Temple = require("../models/Temple");
const DarshanSlot = require("../models/DarshanSlot");
const { getTodayWIB, addDaysToDateString, dateStringToUTCDate } = require("./dateTime");

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const FORCE = args.includes("--force");

const TEMPLES = [
  { templeName: "Kashi Vishwanath Temple", location: "Varanasi, Uttar Pradesh", darshanStartTime: "05:00", darshanEndTime: "21:00", price: 50000 },
  { templeName: "Somnath Temple", location: "Veraval, Gujarat", darshanStartTime: "06:00", darshanEndTime: "21:00", price: 35000 },
  { templeName: "Mahakaleshwar Temple", location: "Ujjain, Madhya Pradesh", darshanStartTime: "05:00", darshanEndTime: "20:00", price: 75000 },
  { templeName: "Tirumala Venkateswara Temple", location: "Tirupati, Andhra Pradesh", darshanStartTime: "05:00", darshanEndTime: "21:00", price: 100000 },
];

const SLOT_TIMES = [
  ["06:00", "08:00"],
  ["10:00", "12:00"],
  ["17:00", "19:00"],
];

const randomSeats = () => 20 + Math.floor(Math.random() * 31); // 20-50

async function run() {
  if (process.env.NODE_ENV === "production" && !FORCE) {
    console.error("Refusing to seed in production. Use --force to override.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  if (RESET) {
    await DarshanSlot.deleteMany({});
    await Temple.deleteMany({});
    console.log("Reset: Temple and DarshanSlot cleared (User untouched)");
  }

  const today = getTodayWIB();
  const tomorrow = addDaysToDateString(today, 1);
  let created = 0;
  let skipped = 0;

  for (const t of TEMPLES) {
    const { price, ...templeData } = t;
    await Temple.updateOne({ templeName: t.templeName }, { $set: templeData }, { upsert: true });
    const temple = await Temple.findOne({ templeName: t.templeName }).lean();

    const ops = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = addDaysToDateString(today, d);
      SLOT_TIMES.forEach(([startTime, endTime], i) => {
        if (startTime < t.darshanStartTime || endTime > t.darshanEndTime) {
          throw new Error(`Slot ${startTime}-${endTime} is outside window of ${t.templeName}`);
        }
        const isFullDemo = t === TEMPLES[0] && dateStr === tomorrow && i === 0;
        ops.push({
          updateOne: {
            filter: { temple: temple._id, date: dateStringToUTCDate(dateStr), startTime },
            update: { $setOnInsert: { endTime, availableSeats: isFullDemo ? 0 : randomSeats(), price } },
            upsert: true,
          },
        });
      });
    }
    const res = await DarshanSlot.bulkWrite(ops);
    created += res.upsertedCount;
    skipped += ops.length - res.upsertedCount;
  }

  console.log(`Temples: ${TEMPLES.length} | Slots created: ${created}, skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});