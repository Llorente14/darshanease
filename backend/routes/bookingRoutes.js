const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  createBookingValidator,
  getBookingValidator,
} = require("../middleware/validators/bookingValidator");
const { createBookingHandler, getBookingHandler } = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, createBookingValidator, validate, createBookingHandler);
router.get("/:id", protect, getBookingValidator, validate, getBookingHandler);

module.exports = router;
