const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  createBookingValidator,
  getBookingValidator,
} = require("../middleware/validators/bookingValidator");
const {
  createBookingHandler,
  getBookingHandler,
  getMyBookingsHandler,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, createBookingValidator, validate, createBookingHandler);
// /me must stay above /:id, otherwise "me" is treated as a booking id
router.get("/me", protect, getMyBookingsHandler);
router.get("/:id", protect, getBookingValidator, validate, getBookingHandler);

module.exports = router;
