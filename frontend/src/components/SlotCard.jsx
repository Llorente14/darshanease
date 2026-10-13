import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  formatPrice,
  formatSeatsLeft,
  formatSlotDateParts,
  formatTimeRange,
} from "../utils/format";
import { cardEnter } from "../utils/motionPresets";

// Badge text + tone per API status. Full and expired use neutral tones and a muted card,
// so the state is shown by text and style, not color alone.
const STATUS = {
  available: { label: "Available", tone: "primary" },
  full: { label: "Full", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

function MapPinIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Pure presentational card: renders the slot it receives, holds no state and fetches nothing.
// Keyed by slot._id by the parent, so a later seat update (USN-4) just swaps the slot object.
// `footer` is an optional slot for a future action (booking in USN-5). Renders nothing when absent.
export default function SlotCard({ slot, footer, index = 0 }) {
  const { label, tone } = STATUS[slot.status] ?? {
    label: slot.status,
    tone: "neutral",
  };
  const isMuted = slot.status !== "available";
  const { weekday, day, month } = formatSlotDateParts(slot.date);

  return (
    <motion.article className={`slot-card${isMuted ? " is-muted" : ""}`} {...cardEnter(index)}>
      <div className="slot-date">
        <span>{weekday}</span>
        <strong>{day}</strong>
        <small>{month}</small>
      </div>
      <div className="slot-main">
        <Link
          className="temple-link"
          to={`/temples/${slot.temple._id}`}
        >
          {slot.temple.templeName}
        </Link>
        <p>
          <MapPinIcon />
          {slot.temple.location}
        </p>
        <div className="slot-meta">
          <span>
            <ClockIcon />
            {formatTimeRange(slot.startTime, slot.endTime)}
          </span>
          <span className={`status status-${tone}`}>
            <span className="status-dot" aria-hidden="true" />
            {label}
          </span>
          <span>{formatSeatsLeft(slot.availableSeats)}</span>
        </div>
      </div>
      <div className="slot-price">
        <small>per devotee</small>
        <strong>{formatPrice(slot.price)}</strong>
      </div>
      {footer && <div className="slot-footer">{footer}</div>}
    </motion.article>
  );
}
