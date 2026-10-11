const mongoose = require("mongoose");

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeField = {
  type: String,
  required: true,
  match: [TIME_REGEX, "Time must be HH:mm (24h)"],
};

const templeSchema = new mongoose.Schema(
  {
    templeName: { type: String, required: true, trim: true, unique: true },
    location: { type: String, required: true, trim: true },
    darshanStartTime: timeField,
    darshanEndTime: timeField,
  },
  { timestamps: true }
);

templeSchema.pre("validate", function () {
  if (this.darshanStartTime && this.darshanEndTime && this.darshanEndTime <= this.darshanStartTime) {
    this.invalidate("darshanEndTime", "darshanEndTime must be later than darshanStartTime");
  }
});

module.exports = mongoose.model("Temple", templeSchema);