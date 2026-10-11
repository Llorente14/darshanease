const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── protect ────────────────────────────────────────────────────────────────
// Verifies the Authorization: Bearer <token> header.
// On success, attaches the user document (without password) to req.user.
// All error paths return the standard { success:false, message } shape.
// ─────────────────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const token = authHeader.split(" ")[1];

    // jwt.verify throws on any issue; we handle the two expected error types explicitly.
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired, please log in again",
        });
      }
      // JsonWebTokenError, NotBeforeError, and any other JWT error
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Load the user without password; if the account was deleted after token issuance, reject.
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    // Catch-all so an unexpected error (e.g. DB down) never crashes the server
    next(err);
  }
};

// ─── authorize ───────────────────────────────────────────────────────────────
// Factory that returns role-checking middleware.
// Must be used AFTER protect (depends on req.user being set).
// Usage: router.get("/admin-only", protect, authorize("admin"), handler)
// ─────────────────────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
