require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Temple = require("../models/Temple");

// Development helper: promotes an existing user to organizer. Never creates users, never demotes admins.
const args = process.argv.slice(2);
const CLAIM_UNOWNED = args.includes("--claim-unowned");
const FORCE = args.includes("--force");
const email = args.find((arg) => !arg.startsWith("--"));

const USAGE = "Usage: npm run make-organizer -- <email> [--claim-unowned] [--force]";

async function run() {
  if (!email) {
    console.error(USAGE);
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !FORCE) {
    console.error("Refusing to change roles in production. Use --force to override.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const fail = async (message) => {
    console.error(message);
    await mongoose.disconnect();
    process.exit(1);
  };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return fail(`No user found with email ${email}. Register the account first.`);
  if (user.role === "admin") return fail("This account is an admin. Admins are not changed by this script.");

  await User.updateOne({ _id: user._id }, { $set: { role: "organizer" } });
  console.log(`${user.email} is now an organizer (was: ${user.role}).`);

  if (CLAIM_UNOWNED) {
    const result = await Temple.updateMany(
      { $or: [{ organizer: { $exists: false } }, { organizer: null }] },
      { $set: { organizer: user._id } }
    );
    console.log(`Claimed ${result.modifiedCount} unowned temple(s) for ${user.email}.`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("make-organizer failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
