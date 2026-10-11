const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { createBookingValidator } = require("../middleware/validators/bookingValidator");
const { createBookingHandler } = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, createBookingValidator, validate, createBookingHandler);

module.exports = router;
