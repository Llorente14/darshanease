const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");

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

module.exports = { register };
