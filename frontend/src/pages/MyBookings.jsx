import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { cancelBooking, getMyBookings, modifyBooking } from "../services/bookingService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import Topbar from "../components/Topbar";
import { useToast } from "../components/toastContext";
import { formatPrice, formatSlotDateParts, formatTimeRange } from "../utils/format";
import { cardEnter, modalBackdrop, modalPanel } from "../utils/motionPresets";

// Status badge per API status. Unknown values are shown as-is with a neutral tone.
const STATUS_BADGE = {
  confirmed: { label: "Confirmed", tone: "status-success" },
  pending: { label: "Pending", tone: "status-warning" },
  cancelled: { label: "Cancelled", tone: "status-danger" },
  failed: { label: "Failed", tone: "status-danger" },
};

const MAX_DEVOTEES = 10;

// "2026-10-12T10:55:15.987Z" -> "17:55" (WIB)
const formatWibTime = (value) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

const statusBadge = (status) =>
  STATUS_BADGE[status] ?? { label: String(status ?? "Unknown"), tone: "status-neutral" };

// One line for the dialogs: temple · code · date · time
const bookingDetail = (booking) => {
  const parts = formatSlotDateParts(booking.slot.date);
  return [
    booking.slot.temple.templeName,
    booking.bookingCode,
    `${parts.weekday}, ${parts.day} ${parts.month}`,
    formatTimeRange(booking.slot.startTime, booking.slot.endTime),
  ].join(" · ");
};

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

function BookingCard({ index, booking, muted, onView, onPay, onCancel, onModify }) {
  const { slot } = booking;
  const parts = formatSlotDateParts(slot.date);
  const badge = statusBadge(booking.status);

  return (
    <motion.article className={`history-card${muted ? " muted" : ""}`} {...cardEnter(index)}>
      <div className="history-date">
        <strong>{parts.day}</strong>
        <span>
          {parts.weekday}
          <br />
          {parts.month}
        </span>
      </div>
      <div className="history-main">
        <div>
          <span className={`status ${badge.tone}`}>
            <span className="status-dot" aria-hidden="true" />
            {badge.label}
          </span>
          <small>{booking.bookingCode}</small>
        </div>
        <h3>{slot.temple.templeName}</h3>
        <p>
          {formatTimeRange(slot.startTime, slot.endTime)}
          <span />
          {booking.numberOfDevotees} devotee(s)
          <span />
          {formatPrice(booking.totalAmount)}
        </p>
      </div>
      <div className="history-actions">
        <Button variant="secondary" onClick={onView}>
          View e-ticket
        </Button>
        {!muted && booking.canChange && (
          <Button variant="secondary" onClick={onModify}>
            Modify
          </Button>
        )}
        {!muted && booking.canChange && (
          <Button variant="danger" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!muted && booking.status === "pending" && <Button onClick={onPay}>Pay now</Button>}
        {!muted && booking.status === "pending" && booking.payment && (
          <small>Pay before {formatWibTime(booking.payment.expiresAt)} WIB</small>
        )}
        {!muted && booking.status !== "pending" && !booking.canChange && <small>Changes closed</small>}
      </div>
    </motion.article>
  );
}

export default function MyBookings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState("upcoming");
  const [retryCount, setRetryCount] = useState(0);

  // Dialog state: { type: "cancel" | "modify", booking } or null
  const [dialog, setDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(1);

  // Same pattern as the other pages: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, data: null, failed: false });
  const requestKey = String(retryCount);
  const isCurrent = request.key === requestKey;
  const loading = !isCurrent;
  const failed = isCurrent && request.failed;
  // Lists come from the server already split and sorted; they are shown as received
  const upcoming = isCurrent && request.data ? request.data.upcoming : [];
  const past = isCurrent && request.data ? request.data.past : [];

  useEffect(() => {
    const controller = new AbortController();
    getMyBookings(controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [requestKey]);

  // Escape closes the dialog, except while a request is in flight
  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) setDialog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, submitting]);

  const openDialog = (next) => {
    if (next.type === "modify") setCount(next.booking.numberOfDevotees);
    setDialog(next);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
  };

  // On success the list is refetched, so the booking moves to Past on its own (server decides)
  const finishAction = (message) => {
    setDialog(null);
    toast.success(message);
    setRetryCount((c) => c + 1);
  };

  const confirmCancel = async () => {
    setSubmitting(true);
    try {
      await cancelBooking(dialog.booking._id);
      finishAction("Booking cancelled.");
    } catch (err) {
      toast.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmModify = async () => {
    setSubmitting(true);
    try {
      await modifyBooking(dialog.booking._id, count);
      finishAction("Booking updated.");
    } catch (err) {
      toast.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const list = tab === "upcoming" ? upcoming : past;

  let body;
  if (loading) {
    body = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading your bookings</h2>
        <p>Fetching your booking history.</p>
      </div>
    );
  } else if (failed) {
    body = (
      <div className="state-card">
        <h2>We could not load your bookings</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((c) => c + 1)}>Try again</Button>
      </div>
    );
  } else if (list.length === 0) {
    body =
      tab === "upcoming" ? (
        <div className="state-card">
          <h2>No upcoming bookings</h2>
          <p>Book a darshan slot and it will appear here.</p>
          <Button onClick={() => navigate("/slots")}>Browse darshan slots</Button>
        </div>
      ) : (
        <div className="state-card">
          <h2>No past bookings</h2>
          <p>Completed and cancelled bookings will appear here.</p>
        </div>
      );
  } else {
    body = (
      <div className="slot-list">
        {list.map((booking, index) => (
          <BookingCard
            key={`${tab}-${booking._id}`}
            index={index}
            booking={booking}
            muted={tab === "past"}
            onView={() => navigate(`/bookings/${booking._id}`)}
            onPay={() => navigate(`/bookings/${booking._id}?pay=1`)}
            onCancel={() => openDialog({ type: "cancel", booking })}
            onModify={() => openDialog({ type: "modify", booking })}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="public-shell">
      <title>My Bookings | DarshanEase</title>
      <Topbar />
      <main className="slots-main">
        <div className="page-header">
          <div>
            <span className="eyebrow">My bookings</span>
            <h1>Booking history</h1>
          </div>
        </div>
        {!loading && !failed && (
          <div className="booking-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upcoming"}
              className={tab === "upcoming" ? "active" : ""}
              onClick={() => setTab("upcoming")}
            >
              Upcoming <span>{upcoming.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "past"}
              className={tab === "past" ? "active" : ""}
              onClick={() => setTab("past")}
            >
              Past <span>{past.length}</span>
            </button>
          </div>
        )}
        {body}
      </main>
      <Footer />

      <AnimatePresence>
      {dialog && (
        <motion.div className="modal-backdrop" onClick={closeDialog} {...modalBackdrop}>
          <motion.div
            {...modalPanel}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={closeDialog}
              disabled={submitting}
            >
              ×
            </button>
            {dialog.type === "cancel" ? (
              <>
                <h2 id="dialog-title">Cancel this booking?</h2>
                <p>{bookingDetail(dialog.booking)}</p>
                <div className="modal-note">Your seats will be released immediately.</div>
                <div className="modal-actions">
                  <Button variant="secondary" onClick={closeDialog} disabled={submitting}>
                    Keep booking
                  </Button>
                  <Button variant="danger" loading={submitting} onClick={confirmCancel}>
                    Yes, cancel booking
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dialog-title">Change number of devotees</h2>
                <p>{bookingDetail(dialog.booking)}</p>
                <div className="counter">
                  <button
                    type="button"
                    aria-label="Remove devotee"
                    disabled={count <= 1 || submitting}
                    onClick={() => setCount(count - 1)}
                  >
                    −
                  </button>
                  <strong>{count}</strong>
                  <button
                    type="button"
                    aria-label="Add devotee"
                    disabled={count >= MAX_DEVOTEES || submitting}
                    onClick={() => setCount(count + 1)}
                  >
                    +
                  </button>
                </div>
                {/* Display only. The server recalculates the real total (tickets + donation). */}
                <p>
                  New total:{" "}
                  {formatPrice(dialog.booking.slot.price * count + (dialog.booking.donationAmount ?? 0))}
                </p>
                {dialog.booking.donationAmount > 0 && (
                  <small>Includes your {formatPrice(dialog.booking.donationAmount)} donation.</small>
                )}
                <div className="modal-actions">
                  <Button variant="secondary" onClick={closeDialog} disabled={submitting}>
                    Close
                  </Button>
                  <Button
                    loading={submitting}
                    disabled={count === dialog.booking.numberOfDevotees}
                    onClick={confirmModify}
                  >
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
