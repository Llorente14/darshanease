const asyncHandler = require("../utils/asyncHandler");
const {
  createBooking,
  getBookingForUser,
  listBookingsForUser,
  cancelBooking,
  modifyBooking,
  toBookingDTO,
} = require("../services/bookingService");
const { generateTicketQR } = require("../services/ticketService");
const { sendBookingConfirmation } = require("../services/emailService");
const { syncPaymentStatus } = require("../services/paymentService");

const createBookingHandler = asyncHandler(async (req, res) => {
  const { slotId, numberOfDevotees, donationAmount } = req.body;
  const booking = await createBooking({
    userId: req.user._id,
    slotId,
    numberOfDevotees,
    donationAmount,
  });
  const dto = toBookingDTO(booking);
  res.status(201).json({
    success: true,
    message: "Booking created",
    data: { booking: dto },
  });

  // Paid bookings are confirmed later by the payment service, which sends the email then.
  // Only a free booking is confirmed right away, so only it is mailed here.
  // Fire-and-forget: the booking already succeeded. A mail failure is logged, never returned.
  if (dto.status === "confirmed") {
    sendBookingConfirmation({ booking: dto, user: req.user }).catch((err) =>
      console.error("Booking confirmation email failed:", err.message)
    );
  }
});

// The ticket QR is only issued once the booking is confirmed. A pending booking has no ticket yet.
const withTicket = async (booking) => {
  const dto = toBookingDTO(booking);
  const qrCode = dto.status === "confirmed" ? await generateTicketQR(booking._id) : null;
  return { ...dto, qrCode };
};

const getBookingHandler = asyncHandler(async (req, res) => {
  const booking = await getBookingForUser({
    bookingId: req.params.id,
    userId: req.user._id,
  });
  res.status(200).json({
    success: true,
    message: "OK",
    data: { booking: await withTicket(booking) },
  });
});

// Called by the frontend after the Snap popup closes. Pulls the latest status from Midtrans for this booking.
const syncPaymentHandler = asyncHandler(async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user._id;
  // Ownership check first, so a stranger cannot trigger a sync on someone else's booking
  await getBookingForUser({ bookingId, userId });
  await syncPaymentStatus(bookingId);

  const booking = await getBookingForUser({ bookingId, userId });
  res.status(200).json({
    success: true,
    message: "OK",
    data: { booking: await withTicket(booking) },
  });
});

const getMyBookingsHandler = asyncHandler(async (req, res) => {
  const { upcoming, past } = await listBookingsForUser(req.user._id);
  res.status(200).json({
    success: true,
    message: "OK",
    data: { upcoming, past, count: upcoming.length + past.length },
  });
});

const cancelBookingHandler = asyncHandler(async (req, res) => {
  const booking = await cancelBooking({ bookingId: req.params.id, userId: req.user._id });
  res.status(200).json({
    success: true,
    message: "Booking cancelled",
    data: { booking: toBookingDTO(booking) },
  });
});

const modifyBookingHandler = asyncHandler(async (req, res) => {
  const booking = await modifyBooking({
    bookingId: req.params.id,
    userId: req.user._id,
    numberOfDevotees: req.body.numberOfDevotees,
  });
  res.status(200).json({
    success: true,
    message: "Booking updated",
    data: { booking: toBookingDTO(booking) },
  });
});

module.exports = {
  createBookingHandler,
  getBookingHandler,
  syncPaymentHandler,
  getMyBookingsHandler,
  cancelBookingHandler,
  modifyBookingHandler,
};
