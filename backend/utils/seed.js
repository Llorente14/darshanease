require("dotenv").config();
const mongoose = require("mongoose");
const Temple = require("../models/Temple");
const DarshanSlot = require("../models/DarshanSlot");
const { getTodayWIB, addDaysToDateString, dateStringToUTCDate } = require("./dateTime");

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const FORCE = args.includes("--force");

// Paste the Cloudinary https URL into imageUrl, then re-run `npm run seed` (no --reset needed).
// Note: seeding sets imageUrl from this file, so an empty value here clears any URL set directly in the DB.
// coordinates are approximate (~4 decimals); verify on openstreetmap.org if precision matters.
const TEMPLES = [
  {
    templeName: "Kashi Vishwanath Temple",
    location: "Varanasi, Uttar Pradesh",
    darshanStartTime: "05:00",
    darshanEndTime: "21:00",
    price: 50000,
    imageUrl: "",
    latitude: 25.3109,
    longitude: 83.0107,
    description: "A revered Shiva temple in Varanasi on the western bank of the Ganga, and one of the twelve Jyotirlingas.",
    offerings: ["Jalabhishek", "Rudrabhishek", "Evening Aarti"],
  },
  { templeName: "Somnath Temple", location: "Veraval, Gujarat", darshanStartTime: "06:00", darshanEndTime: "21:00",
    price: 35000,
    imageUrl: "",
    latitude: 20.8880,
    longitude: 70.4013,
    description: "A Shiva temple on the Arabian Sea coast at Veraval, regarded as the first of the twelve Jyotirlingas.",
    offerings: ["Maha Abhishek", "Sandhya Aarti", "Evening Light and Sound Show"],
  },
  { templeName: "Mahakaleshwar Temple", location: "Ujjain, Madhya Pradesh", darshanStartTime: "05:00", darshanEndTime: "20:00",
    price: 75000,
    imageUrl: "",
    latitude: 23.1828,
    longitude: 75.7682,
    description: "A Shiva temple in Ujjain, one of the twelve Jyotirlingas, known for its early-morning Bhasma Aarti.",
    offerings: ["Bhasma Aarti", "Rudrabhishek", "Evening Aarti"],
  },
  { templeName: "Tirumala Venkateswara Temple", location: "Tirupati, Andhra Pradesh", darshanStartTime: "05:00", darshanEndTime: "21:00",
    price: 100000,
    imageUrl: "",
    latitude: 13.6833,
    longitude: 79.3472,
    description: "A hill temple in Tirupati dedicated to Lord Venkateswara, one of the most visited pilgrimage sites in the world.",
    offerings: ["Srivari Laddu Prasadam", "Suprabhatam Seva", "Hair offering (Mokku)"],
  },
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

  await mongoose.connect(process.env.MONGO_URI);

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