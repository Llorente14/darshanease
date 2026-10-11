const express = require("express");
const { authLimiter, loginLimiter } = require("../middleware/rateLimiter");
const { registerValidator, loginValidator } = require("../middleware/validators/authValidator");
const validate = require("../middleware/validate");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, register);
router.post("/login", loginLimiter, loginValidator, validate, login);
router.get("/me", protect, getMe);

module.exports = router;
