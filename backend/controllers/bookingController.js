const asyncHandler = require("../utils/asyncHandler");
const {
  createBooking,
  getBookingForUser,
  toBookingDTO,
} = require("../services/bookingService");
const { generateTicketQR } = require("../services/ticketService");
const { sendBookingConfirmation } = require("../services/emailService");

const createBookingHandler = asyncHandler(async (req, res) => {
  const { slotId, numberOfDevotees } = req.body;
  const booking = await createBooking({
    userId: req.user._id,
    slotId,
    numberOfDevotees,
  });
  const dto = toBookingDTO(booking);
  res.status(201).json({
    success: true,
    message: "Booking created",
    data: { booking: dto },
  });

  // Fire-and-forget: the booking already succeeded. A mail failure is logged, never returned.
  sendBookingConfirmation({ booking: dto, user: req.user }).catch((err) =>
    console.error("Booking confirmation email failed:", err.message)
  );
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
