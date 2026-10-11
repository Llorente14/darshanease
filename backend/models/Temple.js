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
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be at most 2000 characters"],
      default: "",
    },
    // Empty, or an https URL. Images are hosted externally (no upload here).
    imageUrl: {
      type: String,
      trim: true,
      default: "",
      match: [/^(|https:\/\/[^\s"'()]+)$/, "imageUrl must be empty or an https URL without spaces or quotes"],
    },
    offerings: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
    },
  },
  { timestamps: true }
);

templeSchema.pre("validate", function () {
  if (this.darshanStartTime && this.darshanEndTime && this.darshanEndTime <= this.darshanStartTime) {
    this.invalidate("darshanEndTime", "darshanEndTime must be later than darshanStartTime");
  }
});

module.exports = mongoose.model("Temple", templeSchema);