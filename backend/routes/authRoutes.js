const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { registerValidator } = require("../middleware/validators/authValidator");
const validate = require("../middleware/validate");
const { register } = require("../controllers/authController");

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, register);

module.exports = router;
