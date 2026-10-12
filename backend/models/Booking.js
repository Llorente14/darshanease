const mongoose = require("mongoose");
const { MAX_DONATION_IDR } = require("../utils/bookingPolicy");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "DarshanSlot", required: true },
    numberOfDevotees: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      validate: Number.isInteger,
    },
    totalAmount: { type: Number, required: true, min: 0, validate: Number.isInteger }, // IDR, computed on server
    donationAmount: { type: Number, default: 0, min: 0, max: MAX_DONATION_IDR, validate: Number.isInteger }, // IDR, optional
    bookingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "failed"],
      default: "confirmed",
    },
    snapToken: { type: String, default: "" },
    paymentExpiresAt: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });
// Used by the payment sweeper to find pending bookings whose payment window has passed
bookingSchema.index({ status: 1, paymentExpiresAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
