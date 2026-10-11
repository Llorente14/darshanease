const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");
const bcrypt = require("bcryptjs");

// Pre-computed dummy hash to run against when the email is not found.
// This keeps the response time similar whether the email exists or not,
// preventing user-enumeration via timing differences.
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

// @route   POST /api/auth/register
// @desc    Register a new devotee account
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Allowlist only the fields we accept — never trust role or extras from req.body
  const { name, email, phone, address, password } = req.body;

  // Pre-check duplicate email for a friendly 409 (unique index is the safety net,
  // handled as 409 in errorHandler for the race case)
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Email is already registered",
      errors: [{ field: "email", message: "Email is already registered" }],
    });
  }

  const user = await User.create({
    name,
    email,
    phone,
    address,
    password,
    // Role is NOT read from the request; schema default forces "devotee"
  });

  const token = generateToken(user._id, user.role);

  // user JSON output strips password via schema transform
  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: { user, token },
  });
});

// @route   POST /api/auth/login
// @desc    Authenticate a user and return a JWT
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Attempt to find the user, explicitly selecting the password field (select:false by default)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    // User not found — run a dummy compare to equalise timing (prevent user-enumeration)
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = generateToken(user._id, user.role);

  // Convert to plain object so the schema transform removes password & __v
  const userObj = user.toJSON();

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user: userObj, token },
  });
});

module.exports = { register, login };
