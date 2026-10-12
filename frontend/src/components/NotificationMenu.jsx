import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyBookings } from "../services/bookingService";
import { useAuth } from "../context/useAuth";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 5;

// Dates and times are shown in WIB, whatever the browser's time zone is
const formatWibTime = (value) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

// "YYYY-MM-DD" in WIB, the same format the slot dates use
const wibDate = (date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

// Only upcoming bookings feed the menu: pending payments first, then darshans starting within 24 hours
const buildItems = (upcoming) => {
  const now = Date.now();
  const today = wibDate(new Date(now));
  const pending = [];
  const soon = [];

  for (const booking of upcoming) {
    if (booking.status === "pending" && booking.payment) {
      pending.push({
        key: booking._id,
        text: `Complete payment for ${booking.bookingCode} before ${formatWibTime(booking.payment.expiresAt)} WIB`,
        to: `/bookings/${booking._id}?pay=1`,
      });
    } else if (booking.status === "confirmed") {
      const start = new Date(`${booking.slot.date}T${booking.slot.startTime}:00+07:00`).getTime();
      if (start > now && start - now <= DAY_MS) {
        const day = booking.slot.date === today ? "Today" : "Tomorrow";
        soon.push({
          key: booking._id,
          text: `Darshan at ${booking.slot.temple.templeName}, ${day} ${booking.slot.startTime} WIB`,
          to: `/bookings/${booking._id}`,
        });
      }
    }
  }

  return [...pending, ...soon].slice(0, MAX_ITEMS);
};

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

// Rendered with key={user id}, so a login or logout starts from a fresh feed
export default function NotificationMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userId = user?._id;
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  // The panel stays open only on the page where it was opened, so a route change closes it
  const [openPath, setOpenPath] = useState(null);
  const isOpen = openPath === pathname;

  const [feed, setFeed] = useState({ status: "loading", items: [] });

  // Fetch once when a user is signed in
  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    abortRef.current = controller;
    getMyBookings(controller.signal)
      .then((result) => setFeed({ status: "ready", items: buildItems(result.data.upcoming) }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setFeed({ status: "error", items: [] });
      });
    return () => controller.abort();
  }, [userId]);

  // Fetch again every time the panel opens
  const loadFeed = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFeed({ status: "loading", items: [] });
    getMyBookings(controller.signal)
      .then((result) => setFeed({ status: "ready", items: buildItems(result.data.upcoming) }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setFeed({ status: "error", items: [] });
      });
  };

  // Close on Escape or on a click outside this component
  useEffect(() => {
    if (!isOpen) return undefined;
    const onMouseDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpenPath(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenPath(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const toggle = () => {
    if (isOpen) {
      setOpenPath(null);
      return;
    }
    setOpenPath(pathname);
    if (user) loadFeed();
  };

  const items = user && feed.status === "ready" ? feed.items : [];

  return (
    <div className="profile-wrap" ref={wrapRef}>
      <button
        className="icon-button bell"
        type="button"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <BellIcon />
        {items.length > 0 && <span />}
      </button>
      {isOpen && (
        <div className="profile-menu" role="menu">
          <p>Notifications</p>
          {!user ? (
            <>
              <small>Log in to see updates about your bookings.</small>
              <button type="button" role="menuitem" onClick={() => navigate("/login")}>
                Log in
              </button>
            </>
          ) : (
            <>
              {feed.status === "loading" && <small>Loading notifications…</small>}
              {feed.status === "error" && <small>Could not load notifications.</small>}
              {feed.status === "ready" && items.length === 0 && <small>You&apos;re all caught up.</small>}
              {items.map((item) => (
                <button key={item.key} type="button" role="menuitem" onClick={() => navigate(item.to)}>
                  {item.text}
                </button>
              ))}
              <button type="button" role="menuitem" onClick={() => navigate("/bookings")}>
                View all bookings
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
