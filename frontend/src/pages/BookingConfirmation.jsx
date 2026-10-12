import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getBookingById, syncPayment } from "../services/bookingService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import Topbar from "../components/Topbar";
import { formatPrice, formatSlotDate, formatTimeRange } from "../utils/format";
import { loadSnap } from "../utils/snap";

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

function CrossIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function InfoIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
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

// "2026-10-12T07:35:00.000Z" -> "14:35" (WIB)
const formatWibTime = (value) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryCount, setRetryCount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  // Keyed by booking id: the route keeps this component mounted when only the id changes
  const autoPayFor = useRef(null);
  const expiryCheckedFor = useRef(null);
  const opening = useRef(false);

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

  const paymentWindowOver = booking?.payment ? new Date(booking.payment.expiresAt) <= new Date() : false;

  // The status always comes from the server. Snap callbacks only trigger a check, they never set the status.
  const checkStatus = async () => {
    setPayError("");
    try {
      const result = await syncPayment(bookingId);
      setRequest({ key: requestKey, booking: result.data.booking, failure: null });
    } catch {
      setPayError("Could not check the payment status. Please try again.");
    }
  };

  const settlePayment = () => {
    setPaying(false);
    checkStatus();
  };

  // Loading the script can take a moment, so a ref blocks a second click until the popup has opened
  const pay = async () => {
    if (opening.current) return;
    opening.current = true;
    try {
      const snap = await loadSnap();
      setPaying(true);
      setPayError("");
      snap.pay(booking.payment.snapToken, {
        onSuccess: settlePayment,
        onPending: settlePayment,
        onError: settlePayment,
        onClose: settlePayment,
      });
    } catch (err) {
      setPayError(err.message);
    } finally {
      opening.current = false;
    }
  };

  // Arrived from the booking page with ?pay=1: open the popup once, then remove the query from the URL
  useEffect(() => {
    if (!booking || autoPayFor.current === bookingId || searchParams.get("pay") !== "1") return;
    autoPayFor.current = bookingId;
    setSearchParams({}, { replace: true });
    // pay() only sets state after the Snap script has loaded (async), so no synchronous cascade
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (booking.status === "pending" && !paymentWindowOver) pay();
  });

  // Window already over when the page opens: check the server once. The check button stays for later.
  useEffect(() => {
    if (!booking || booking.status !== "pending" || !paymentWindowOver || expiryCheckedFor.current === bookingId) return;
    expiryCheckedFor.current = bookingId;
    checkStatus();
  });

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
  } else if (booking.status === "pending") {
    const { slot } = booking;
    body = (
      <div className="payment-layout">
        <section className="form-card">
          <div className="payment-head">
            <span>
              <WalletIcon />
            </span>
            <div>
              <h2>Complete your payment</h2>
              <p>Your seats are held until {formatWibTime(booking.payment.expiresAt)} WIB</p>
            </div>
            <span className="secure-pill">Midtrans Sandbox</span>
          </div>
          <div className="payment-summary">
            <p>
              <strong>{booking.bookingCode}</strong>
              <span>Booking code</span>
            </p>
            <p>
              <strong>{slot.temple.templeName}</strong>
              <span>Temple</span>
            </p>
            <p>
              <strong>{formatSlotDate(slot.date)}</strong>
              <span>Date</span>
            </p>
            <p>
              <strong>{formatTimeRange(slot.startTime, slot.endTime)}</strong>
              <span>Time</span>
            </p>
            <p>
              <strong>{booking.numberOfDevotees}</strong>
              <span>Devotees</span>
            </p>
          </div>
        </section>

        <aside className="summary-card">
          <h2>Payment</h2>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatPrice(booking.totalAmount)}</strong>
          </div>
          {paymentWindowOver ? (
            <p className="summary-help">Payment window has ended. Checking status…</p>
          ) : (
            <Button className="wide" loading={paying} onClick={pay}>
              Pay now
            </Button>
          )}
          <Button variant="secondary" className="wide" disabled={paying} onClick={checkStatus}>
            I have paid, check status
          </Button>
          {payError && (
            <p className="field-error" role="alert">
              {payError}
            </p>
          )}
        </aside>
      </div>
    );
  } else if (booking.status === "failed") {
    body = (
      <div className="result-page">
        <span className="result-icon failure">
          <CrossIcon />
        </span>
        <h1>Payment not completed</h1>
        <p>The payment failed or expired, so your seats were released.</p>
        <div className="result-actions">
          <Button onClick={() => navigate("/slots")}>Book again</Button>
          <Button variant="secondary" onClick={() => navigate("/bookings")}>
            My bookings
          </Button>
        </div>
      </div>
    );
  } else if (booking.status === "cancelled") {
    body = (
      <div className="result-page">
        <span className="result-icon">
          <InfoIcon />
        </span>
        <h1>Booking cancelled</h1>
        <p>This booking was cancelled.</p>
        <div className="result-actions">
          <Button onClick={() => navigate("/slots")}>Book again</Button>
          <Button variant="secondary" onClick={() => navigate("/bookings")}>
            My bookings
          </Button>
        </div>
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
                {booking.donationAmount > 0 && (
                  <>
                    <div>
                      <small>Tickets</small>
                      <strong>{formatPrice(booking.totalAmount - booking.donationAmount)}</strong>
                    </div>
                    <div>
                      <small>Donation</small>
                      <strong>{formatPrice(booking.donationAmount)}</strong>
                    </div>
                  </>
                )}
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
                {booking.qrCode && (
                  <img
                    src={booking.qrCode}
                    alt={`QR code for booking ${booking.bookingCode}`}
                    width="160"
                    height="160"
                  />
                )}
              </div>
              <p>Scan at entrance</p>
            </div>
          </div>
          <div className="ticket-footer">Please arrive 15 minutes before your darshan time.</div>
        </article>
        <div className="confirmation-actions">
          <Button onClick={() => navigate("/slots")}>Book another slot</Button>
          <Button variant="secondary" onClick={() => navigate("/bookings")}>
            My bookings
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
