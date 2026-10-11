const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [255, "Address must be at most 255 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["devotee", "organizer", "admin"],
      default: "devotee",
    },
  },
  { timestamps: true }
);

// Hash password with bcrypt (10 salt rounds) before saving, only when modified.
// Mongoose 9: async hooks must not declare a `next` callback; just return/throw.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Remove password and __v from any JSON/object output
const stripSensitive = (doc, ret) => {
  delete ret.password;
  delete ret.__v;
  return ret;
};
userSchema.set("toJSON", {
  transform: stripSensitive,
  virtuals: true,
});
userSchema.set("toObject", {
  transform: stripSensitive,
  virtuals: true,
});

module.exports = mongoose.model("User", userSchema);
