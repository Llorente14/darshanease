const express = require("express");
const { authLimiter, loginLimiter } = require("../middleware/rateLimiter");
const { registerValidator, loginValidator } = require("../middleware/validators/authValidator");
const validate = require("../middleware/validate");
const { register, login } = require("../controllers/authController");

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, register);
router.post("/login", loginLimiter, loginValidator, validate, login);

module.exports = router;
