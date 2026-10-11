const rateLimit = require("express-rate-limit");

// Global limiter: 100 requests / 15 minutes per IP on /api
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// Auth limiter: 20 requests / 15 minutes per IP for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth attempts, please try again in 15 minutes.",
  },
});

// Login limiter: 10 failed requests / 15 minutes per IP.
// skipSuccessfulRequests:true means successful logins do NOT count toward the limit —
// only failed attempts (4xx/5xx) are counted, preventing lockout for legitimate users.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many failed login attempts, please try again in 15 minutes.",
  },
});

module.exports = { globalLimiter, authLimiter, loginLimiter };
