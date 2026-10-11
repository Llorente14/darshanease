const rateLimit = require("express-rate-limit");

// Global limiter: 100 requests / 15 minutes per IP on /api
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

module.exports = globalLimiter;
