const mongoose = require("mongoose");

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeField = {
  type: String,
  required: true,
  match: [TIME_REGEX, "Time must be HH:mm (24h)"],
};

const darshanSlotSchema = new mongoose.Schema(
  {
    temple: { type: mongoose.Schema.Types.ObjectId, ref: "Temple", required: true },
    date: { type: Date, required: true }, // 00:00:00.000Z of the WIB calendar date
    startTime: timeField,
    endTime: timeField,
    availableSeats: { type: Number, required: true, min: 0, validate: Number.isInteger },
    price: { type: Number, required: true, min: 0, validate: Number.isInteger }, // IDR
  },
  { timestamps: true }
);

darshanSlotSchema.pre("validate", function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "endTime must be later than startTime");
  }
});

darshanSlotSchema.index({ temple: 1, date: 1, startTime: 1 }, { unique: true });
darshanSlotSchema.index({ date: 1, startTime: 1 });

module.exports = mongoose.model("DarshanSlot", darshanSlotSchema);