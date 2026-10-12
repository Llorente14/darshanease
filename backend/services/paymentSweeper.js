const Booking = require("../models/Booking");
const { syncPaymentStatus } = require("./paymentService");
const { PAYMENT_SWEEP_GRACE_MINUTES } = require("../utils/bookingPolicy");

const SWEEP_INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 50;

// Stops a slow sweep from starting a second one on top of it
let running = false;

// Pending bookings whose payment window (plus grace) has passed. Each one gets a status sync,
// which confirms, fails or leaves it pending depending on what Midtrans says.
const sweepExpiredPayments = async () => {
  const cutoff = new Date(Date.now() - PAYMENT_SWEEP_GRACE_MINUTES * 60 * 1000);
  const bookings = await Booking.find({ status: "pending", paymentExpiresAt: { $lt: cutoff } })
    .select("_id")
    .limit(BATCH_SIZE)
    .lean();

  for (const booking of bookings) {
    try {
      await syncPaymentStatus(booking._id);
    } catch (err) {
      console.error(`Payment sweep failed for booking ${String(booking._id)}:`, err.message);
    }
  }
};

const startPaymentSweeper = () => {
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await sweepExpiredPayments();
    } catch (err) {
      console.error("Payment sweep failed:", err.message);
    } finally {
      running = false;
    }
  }, SWEEP_INTERVAL_MS);
  // Keeps the sweeper from holding the process open on its own
  timer.unref();
  return timer;
};

module.exports = { startPaymentSweeper, sweepExpiredPayments };
