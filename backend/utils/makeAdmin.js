require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

// Development helper: promotes an existing account to admin and makes sure it is active.
// It never creates a user and never receives a password. Register the account first.
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const email = args.find((arg) => !arg.startsWith("--"));

const USAGE = "Usage: npm run make-admin -- <email> [--force]";

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

  await User.updateOne({ _id: user._id }, { $set: { role: "admin", isActive: true } });
  console.log(`${user.email} is now an admin and active (was: ${user.role}).`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("make-admin failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
