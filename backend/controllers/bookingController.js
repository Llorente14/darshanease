const asyncHandler = require("../utils/asyncHandler");
const { createBooking } = require("../services/bookingService");

// Response shape for a booking. The date is formatted the same way as GET /slots.
const toBookingDTO = (booking) => ({
  _id: booking._id,
  numberOfDevotees: booking.numberOfDevotees,
  totalAmount: booking.totalAmount,
  bookingDate: booking.bookingDate,
  slot: {
    _id: booking.slot._id,
    date: booking.slot.date.toISOString().slice(0, 10),
    startTime: booking.slot.startTime,
    endTime: booking.slot.endTime,
    price: booking.slot.price,
    temple: {
      templeName: booking.slot.temple.templeName,
      location: booking.slot.temple.location,
    },
  },
});

const createBookingHandler = asyncHandler(async (req, res) => {
  const { slotId, numberOfDevotees } = req.body;
  const booking = await createBooking({
    userId: req.user._id,
    slotId,
    numberOfDevotees,
  });
  res.status(201).json({
    success: true,
    message: "Booking created",
    data: { booking: toBookingDTO(booking) },
  });
});

module.exports = { createBookingHandler };
