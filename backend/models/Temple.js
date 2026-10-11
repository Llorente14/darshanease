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
    // WGS84 decimal degrees. Optional. Set through the seed now, through the organizer form later (USN-14).
    latitude: {
      type: Number,
      min: [-90, "latitude must be between -90 and 90"],
      max: [90, "latitude must be between -90 and 90"],
    },
    longitude: {
      type: Number,
      min: [-180, "longitude must be between -180 and 180"],
      max: [180, "longitude must be between -180 and 180"],
    },
    // Owner of the temple. Set when an organizer creates it; empty for seeded temples.
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

templeSchema.pre("validate", function () {
  if (this.darshanStartTime && this.darshanEndTime && this.darshanEndTime <= this.darshanStartTime) {
    this.invalidate("darshanEndTime", "darshanEndTime must be later than darshanStartTime");
  }

  // Latitude and longitude are only meaningful as a pair
  const hasLat = this.latitude != null;
  const hasLng = this.longitude != null;
  if (hasLat !== hasLng) {
    this.invalidate(hasLat ? "longitude" : "latitude", "latitude and longitude must be set together");
  }
});

module.exports = mongoose.model("Temple", templeSchema);