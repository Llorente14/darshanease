const asyncHandler = require("../utils/asyncHandler");
const {
  createBooking,
  getBookingForUser,
  toBookingDTO,
} = require("../services/bookingService");
const { generateTicketQR } = require("../services/ticketService");

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

const getBookingHandler = asyncHandler(async (req, res) => {
  const booking = await getBookingForUser({
    bookingId: req.params.id,
    userId: req.user._id,
  });
  const qrCode = await generateTicketQR(booking._id);
  res.status(200).json({
    success: true,
    message: "OK",
    data: { booking: { ...toBookingDTO(booking), qrCode } },
  });
});

module.exports = { createBookingHandler, getBookingHandler };
