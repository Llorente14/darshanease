const crypto = require("crypto");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { snap } = require("../config/midtrans");
const { PAYMENT_TIMEOUT_MINUTES, PAYMENT_SWEEP_GRACE_MINUTES } = require("../utils/bookingPolicy");
const { releaseSeats } = require("./seatService");
const { sendBookingConfirmation } = require("./emailService");
// bookingService requires this file lazily (inside createBooking), so this top-level require is safe
const bookingService = require("./bookingService");

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const FAILED_STATUSES = ["deny", "cancel", "expire", "failure"];

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Midtrans expects "YYYY-MM-DD HH:mm:ss +0700" (WIB). Shift to WIB, then read the UTC fields.
const toMidtransTime = (date) =>
  new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ") + " +0700";

// Snap popup token for a pending booking. Item details are left out so they cannot differ from gross_amount.
const createSnapTransaction = async ({ booking, user }) => {
  const tx = await snap.createTransaction({
    transaction_details: { order_id: String(booking._id), gross_amount: booking.totalAmount },
    customer_details: { first_name: user.name, email: user.email, phone: user.phone },
    expiry: {
      start_time: toMidtransTime(new Date()),
      unit: "minutes",
      duration: PAYMENT_TIMEOUT_MINUTES,
    },
  });
  return { token: tx.token, redirectUrl: tx.redirect_url };
};

// Maps a Midtrans status to our outcome. Anything not listed is ignored, so the booking is left alone.
const interpretStatus = (tx) => {
  const status = tx.transaction_status;
  if (status === "settlement") return "paid";
  if (status === "capture") {
    if (tx.fraud_status == null || tx.fraud_status === "accept") return "paid";
    if (tx.fraud_status === "challenge") return "pending";
    return "ignore";
  }
  if (FAILED_STATUSES.includes(status)) return "failed";
  if (status === "pending") return "pending";
  return "ignore";
};

const sendConfirmationEmail = async (booking) => {
  try {
    const user = await User.findById(booking.user).lean();
    if (!user) return;
    await sendBookingConfirmation({ booking: bookingService.toBookingDTO(booking), user });
  } catch (err) {
    console.error("Booking confirmation email failed:", err.message);
  }
};

// Returns true only for the request that actually moved the booking from pending to confirmed.
// Repeat notifications and syncs find no pending row, so they do not send a second email.
const confirmPendingBooking = async (bookingId) => {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "pending" },
    { $set: { status: "confirmed" } },
    { returnDocument: "after" }
  )
    .populate(bookingService.SLOT_POPULATE)
    .lean();
  if (!updated) return false;

  // Fire-and-forget: a mail failure is logged and never undoes the confirmation
  sendConfirmationEmail(updated);
  return true;
};

// The atomic flip from pending is what prevents a double seat release.
const failPendingBooking = async (bookingId) => {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "pending" },
    { $set: { status: "failed" } },
    { returnDocument: "after" }
  ).lean();
  if (!updated) return false;

  await releaseSeats(updated.slot, updated.numberOfDevotees).catch((err) =>
    console.error("Seat release failed after payment failure:", err.message)
  );
  return true;
};

const applyTransactionStatus = async (booking, tx) => {
  const bookingId = String(booking._id);
  if (String(tx.order_id) !== bookingId) {
    console.error(`Midtrans order_id does not match booking ${bookingId}, ignored`);
    return;
  }

  const outcome = interpretStatus(tx);
  if (outcome === "paid") {
    // Never confirm a booking whose paid amount differs from what the server computed
    if (Number(tx.gross_amount) !== booking.totalAmount) {
      console.error(
        `Amount mismatch for booking ${bookingId}: paid ${tx.gross_amount}, expected ${booking.totalAmount}`
      );
      return;
    }
    await confirmPendingBooking(booking._id);
  } else if (outcome === "failed") {
    await failPendingBooking(booking._id);
  }
};

// Pulls the latest status from Midtrans for one pending booking. Never throws: the booking stays pending on errors.
const syncPaymentStatus = async (bookingId) => {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking || booking.status !== "pending") return;

  try {
    const tx = await snap.transaction.status(String(bookingId));
    await applyTransactionStatus(booking, tx);
  } catch (err) {
    // 404: Midtrans has no transaction because the user never picked a payment method.
    // Only give up once the window plus grace has passed, so a slow payment is not failed early.
    const graceEnd =
      booking.paymentExpiresAt &&
      new Date(booking.paymentExpiresAt.getTime() + PAYMENT_SWEEP_GRACE_MINUTES * 60 * 1000);
    if (Number(err.httpStatusCode) === 404 && graceEnd && graceEnd <= new Date()) {
      await failPendingBooking(booking._id);
      return;
    }
    console.error(`Payment status sync failed for booking ${String(bookingId)}:`, err.message);
  }
};

// Midtrans: SHA512(order_id + status_code + gross_amount + server key), hex. Compared in constant time.
const verifyNotificationSignature = (body) => {
  const { order_id, status_code, gross_amount, signature_key } = body || {};
  if ([order_id, status_code, gross_amount, signature_key].some((value) => value == null)) return false;

  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");
  const received = String(signature_key).toLowerCase();
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
};

// The body is only used for the signature and the order id. The status itself is read again from Midtrans.
const handleNotification = async (body) => {
  if (!verifyNotificationSignature(body)) throw httpError(403, "Invalid notification signature");

  const orderId = String(body.order_id);
  if (!OBJECT_ID_PATTERN.test(orderId)) return;
  await syncPaymentStatus(orderId);
};

module.exports = {
  toMidtransTime,
  createSnapTransaction,
  interpretStatus,
  confirmPendingBooking,
  failPendingBooking,
  applyTransactionStatus,
  syncPaymentStatus,
  verifyNotificationSignature,
  handleNotification,
};
