const mongoose = require("mongoose");

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const templeSchema = new mongoose.Schema(
  {
    templeName: {
      type: String,
      required: [true, "Temple name is required"],
      trim: true,
      unique: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    darshanStartTime: {
      type: String,
      required: [true, "Darshan start time is required"],
      match: [TIME_REGEX, "Darshan start time must be in HH:mm format (24-hour)"],
    },
    darshanEndTime: {
      type: String,
      required: [true, "Darshan end time is required"],
      match: [TIME_REGEX, "Darshan end time must be in HH:mm format (24-hour)"],
      validate: {
        validator: function (value) {
          if (!this.darshanStartTime || !value) return true;
          return value > this.darshanStartTime;
        },
        message: "Darshan end time must be later than darshan start time",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Temple", templeSchema);
