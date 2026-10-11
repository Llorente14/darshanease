const mongoose = require("mongoose");

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
    bookingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "failed"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
