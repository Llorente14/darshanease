const asyncHandler = require("../utils/asyncHandler");
const { createBooking, toBookingDTO } = require("../services/bookingService");

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
