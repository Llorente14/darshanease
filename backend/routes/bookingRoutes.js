const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  createBookingValidator,
  getBookingValidator,
  modifyBookingValidator,
} = require("../middleware/validators/bookingValidator");
const {
  createBookingHandler,
  getBookingHandler,
  syncPaymentHandler,
  getMyBookingsHandler,
  cancelBookingHandler,
  modifyBookingHandler,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, createBookingValidator, validate, createBookingHandler);
// /me must stay above /:id, otherwise "me" is treated as a booking id
router.get("/me", protect, getMyBookingsHandler);
router.get("/:id", protect, getBookingValidator, validate, getBookingHandler);
router.post("/:id/payment/sync", protect, getBookingValidator, validate, syncPaymentHandler);
router.patch("/:id/cancel", protect, getBookingValidator, validate, cancelBookingHandler);
router.patch("/:id", protect, modifyBookingValidator, validate, modifyBookingHandler);

module.exports = router;
