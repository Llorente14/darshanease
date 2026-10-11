import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createBooking } from "../services/bookingService";
import { getSlotById } from "../services/slotService";
import { useSlotUpdates } from "../hooks/useSlotUpdates";
import Button from "../components/Button";
import Footer from "../components/Footer";
import Topbar from "../components/Topbar";
import {
  formatPrice,
  formatSeatsLeft,
  formatSlotDate,
  formatSlotDateParts,
  formatTimeRange,
} from "../utils/format";

const MAX_DEVOTEES = 10;

// Shown under the confirm button when the slot cannot be booked
const UNAVAILABLE_REASON = {
  full: "This slot is full. Choose another time.",
  expired: "This darshan slot has already ended.",
};

// Keeps the count between 1 and the seats still free (and the per-booking max)
const clampDevotees = (value, availableSeats) =>
  Math.max(1, Math.min(value, availableSeats, MAX_DEVOTEES));

function ArrowLeftIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
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

export default function BookSlot() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const [devotees, setDevotees] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Same pattern as Slots: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, slot: null, failure: null });
  const requestKey = `${slotId}|${retryCount}`;
  const isCurrent = request.key === requestKey;
  const slot = isCurrent ? request.slot : null;
  const loadFailure = isCurrent ? request.failure : null;

  useEffect(() => {
    const controller = new AbortController();
    getSlotById(slotId, controller.signal)
      .then((result) => setRequest({ key: requestKey, slot: result.data.slot, failure: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const status = err.response?.status;
        const failure = status === 404 || status === 422 ? "notfound" : "error";
        setRequest({ key: requestKey, slot: null, failure });
      });
    return () => controller.abort();
  }, [requestKey, slotId]);

  // Realtime: update this slot's seats and status, and lower the counter if seats dropped below it
  useSlotUpdates(({ slotId: updatedId, availableSeats, status }) => {
    if (updatedId !== slotId) return;
    setRequest((prev) =>
      prev.key === requestKey && prev.slot
        ? { ...prev, slot: { ...prev.slot, availableSeats, status } }
        : prev
    );
    setDevotees((current) => clampDevotees(current, availableSeats));
  });

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createBooking({ slotId, numberOfDevotees: count });
      navigate(`/bookings/${result.data.booking._id}`, { replace: true });
    } catch (err) {
      // 409 not enough seats, 400 slot ended, etc. The form stays usable.
      setSubmitError(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const count = slot ? clampDevotees(devotees, slot.availableSeats) : devotees;
  const max = slot ? Math.min(MAX_DEVOTEES, slot.availableSeats) : MAX_DEVOTEES;
  const canBook = slot?.status === "available" && !submitting;

  let body;
  if (!isCurrent) {
    body = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading darshan slot</h2>
        <p>Fetching the latest seat availability.</p>
      </div>
    );
  } else if (loadFailure === "notfound") {
    body = (
      <div className="state-card">
        <span className="state-icon">
          <ArrowLeftIcon />
        </span>
        <h2>Slot not found</h2>
        <p>This darshan slot may have been removed.</p>
        <Link className="button button-secondary" to="/slots">
          Back to slots
        </Link>
      </div>
    );
  } else if (loadFailure === "error") {
    body = (
      <div className="state-card">
        <span className="state-icon">
          <ArrowLeftIcon />
        </span>
        <h2>We could not load this slot</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((c) => c + 1)}>Try again</Button>
      </div>
    );
  } else {
    const parts = formatSlotDateParts(slot.date);
    body = (
      <div className="booking-layout">
        <section className="form-card">
          <div className="form-section-title">
            <span>1</span>
            <div>
              <h2>Selected darshan</h2>
              <p>Your chosen temple and time</p>
            </div>
          </div>
          <div className="selected-slot">
            <div className="date-block">
              <strong>{parts.day}</strong>
              <span>{parts.weekday}</span>
            </div>
            <div>
              <h3>{slot.temple.templeName}</h3>
              <p>{slot.temple.location}</p>
              <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
              <span>{formatSeatsLeft(slot.availableSeats)}</span>
            </div>
          </div>
          <div className="divider" />
          <div className="form-section-title">
            <span>2</span>
            <div>
              <h2>Devotees</h2>
              <p>Choose how many devotees are visiting</p>
            </div>
          </div>
          <div className="counter-row">
            <div>
              <strong>Number of devotees</strong>
              <small>Max {MAX_DEVOTEES} per booking</small>
            </div>
            <div className="counter">
              <button
                type="button"
                aria-label="Remove devotee"
                disabled={count <= 1}
                onClick={() => setDevotees(count - 1)}
              >
                −
              </button>
              <strong>{count}</strong>
              <button
                type="button"
                aria-label="Add devotee"
                disabled={count >= max}
                onClick={() => setDevotees(count + 1)}
              >
                +
              </button>
            </div>
          </div>
        </section>

        <aside className="summary-card">
          <h2>Booking summary</h2>
          <div className="summary-lines">
            <p>
              <span>Temple</span>
              <strong>{slot.temple.templeName}</strong>
            </p>
            <p>
              <span>Date</span>
              <strong>{formatSlotDate(slot.date)}</strong>
            </p>
            <p>
              <span>Time</span>
              <strong>{formatTimeRange(slot.startTime, slot.endTime)}</strong>
            </p>
            <p>
              <span>Price per devotee</span>
              <strong>{formatPrice(slot.price)}</strong>
            </p>
            <p>
              <span>Devotees</span>
              <strong>{count}</strong>
            </p>
          </div>
          {/* Display only. The server computes the real total from the slot price. */}
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatPrice(slot.price * count)}</strong>
          </div>
          <Button className="wide" loading={submitting} disabled={!canBook} onClick={handleConfirm}>
            Confirm booking
          </Button>
          {!canBook && !submitting && UNAVAILABLE_REASON[slot.status] && (
            <p className="summary-help">{UNAVAILABLE_REASON[slot.status]}</p>
          )}
          {submitError && <p className="field-error">{submitError}</p>}
        </aside>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <Topbar />
      <main className="slots-main">
        <button className="back-link" type="button" onClick={() => navigate("/slots")}>
          <ArrowLeftIcon />
          Back to slots
        </button>
        <div className="page-header">
          <div>
            <span className="eyebrow">Book darshan</span>
            <h1>Complete your booking</h1>
            <p>Review the selected slot and choose how many devotees are visiting.</p>
          </div>
        </div>
        {body}
      </main>
      <Footer />
    </div>
  );
}
