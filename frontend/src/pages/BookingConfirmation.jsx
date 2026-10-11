import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBookingById } from "../services/bookingService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import Topbar from "../components/Topbar";
import { formatPrice, formatSlotDate, formatTimeRange } from "../utils/format";

function CheckIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);

  // Same pattern as the other pages: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, booking: null, failure: null });
  const requestKey = `${bookingId}|${retryCount}`;
  const isCurrent = request.key === requestKey;
  const booking = isCurrent ? request.booking : null;
  const failure = isCurrent ? request.failure : null;

  useEffect(() => {
    const controller = new AbortController();
    getBookingById(bookingId, controller.signal)
      .then((result) => setRequest({ key: requestKey, booking: result.data.booking, failure: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const status = err.response?.status;
        // 404 is also what the server returns for someone else's booking
        const kind = status === 404 || status === 422 ? "notfound" : "error";
        setRequest({ key: requestKey, booking: null, failure: kind });
      });
    return () => controller.abort();
  }, [requestKey, bookingId]);

  let body;
  if (!isCurrent) {
    body = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading your e-ticket</h2>
        <p>Fetching your booking details.</p>
      </div>
    );
  } else if (failure === "notfound") {
    body = (
      <div className="state-card">
        <h2>Booking not found</h2>
        <p>This booking does not exist or is not linked to your account.</p>
        <Button variant="secondary" onClick={() => navigate("/slots")}>
          Back to slots
        </Button>
      </div>
    );
  } else if (failure === "error") {
    body = (
      <div className="state-card">
        <h2>We could not load your booking</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else {
    // The total is the server value (booking.totalAmount); it is not recalculated here.
    const { slot } = booking;
    body = (
      <>
        <div className="confirmation-head">
          <span className="result-icon success">
            <CheckIcon />
          </span>
          <h1>Booking confirmed</h1>
          <p>Show this e-ticket at the temple entrance.</p>
        </div>
        <article className="e-ticket">
          <div className="ticket-top">
            <strong>DarshanEase e-ticket</strong>
            <div className="booking-id">
              <small>Booking code</small>
              <strong>{booking.bookingCode}</strong>
            </div>
          </div>
          <div className="ticket-body">
            <div className="ticket-details">
              <h2>{slot.temple.templeName}</h2>
              <p>{slot.temple.location}</p>
              <div className="ticket-grid">
                <div>
                  <small>Date</small>
                  <strong>{formatSlotDate(slot.date)}</strong>
                </div>
                <div>
                  <small>Time</small>
                  <strong>{formatTimeRange(slot.startTime, slot.endTime)}</strong>
                </div>
                <div>
                  <small>Devotees</small>
                  <strong>{booking.numberOfDevotees}</strong>
                </div>
                <div>
                  <small>Total</small>
                  <strong>{formatPrice(booking.totalAmount)}</strong>
                </div>
              </div>
              <div className="booking-id">
                <small>Booking ID</small>
                <strong>{booking._id}</strong>
              </div>
            </div>
            <div className="ticket-qr">
              <div className="qr-visual">
                <img
                  src={booking.qrCode}
                  alt={`QR code for booking ${booking.bookingCode}`}
                  width="160"
                  height="160"
                />
              </div>
              <p>Scan at entrance</p>
            </div>
          </div>
          <div className="ticket-footer">Please arrive 15 minutes before your darshan time.</div>
        </article>
        <div className="confirmation-actions">
          <Button onClick={() => navigate("/slots")}>Book another slot</Button>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="public-shell">
      <Topbar />
      <main className="slots-main">{body}</main>
      <Footer />
    </div>
  );
}
