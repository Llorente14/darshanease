import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationMenu from "./NotificationMenu";
import { useToast } from "./toastContext";
import { FAST, NORMAL, tap } from "../utils/motionPresets";

export function Logo() {
  return (
    <span className="logo" aria-label="DarshanEase">
      <span className="logo-mark">
        <svg width="20" height="20" viewBox="10 8 44 48" aria-hidden="true">
          <path fill="currentColor" d="M32 10l3 5h-6z M27 16h10l2 6H25z M23 23h18l2 7H21z M19 31h26l2 8H17z M14 40h36v14H14z" />
          <path fill="var(--primary-dark)" d="M28 54v-8a4 4 0 0 1 8 0v8z" />
        </svg>
      </span>
      <span>
        Darshan<span>Ease</span>
      </span>
    </span>
  );
}

const SEARCH_MAX_LENGTH = 50;
const SEARCH_DEBOUNCE_MS = 300;

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// The /slots URL for a search term. Other filters (date, temple) are kept only when they are in the current query.
const searchUrl = (currentSearch, term) => {
  const params = new URLSearchParams(currentSearch);
  if (term) params.set("q", term);
  else params.delete("q");
  params.delete("page");
  const query = params.toString();
  return query ? `/slots?${query}` : "/slots";
};

// Navbar search. On /slots it filters live, like the filter bar: the list follows the input after a short pause.
// Elsewhere the search is sent on submit and opens /slots.
function TopSearch({ onSlots, urlQuery, onDone }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);

  // The URL changed from outside (filter bar, another page): follow it, unless the input already says the same
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== value.trim()) setValue(urlQuery);
  }

  useEffect(() => {
    if (!onSlots) return undefined;
    const term = value.trim();
    if (term === urlQuery) return undefined;
    const timer = setTimeout(() => {
      navigate(searchUrl(window.location.search, term), { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, onSlots, navigate]);

  const onSubmit = (event) => {
    event.preventDefault();
    navigate(searchUrl(onSlots ? window.location.search : "", value.trim()), { replace: onSlots });
    onDone?.();
  };

  return (
    <form className="top-search" role="search" onSubmit={onSubmit}>
      <SearchIcon />
      <input
        aria-label="Search"
        placeholder="Search temple, city, or offering..."
        maxLength={SEARCH_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setValue("");
        }}
      />
      {value && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setValue("")}>
          ×
        </button>
      )}
    </form>
  );
}

const MOBILE_QUERY = "(min-width: 761px)";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function MenuIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// Slide-in navigation for phones. Closes on link click, Escape, backdrop click and route change (the parent resets it).
// While open: body scroll is locked, Tab stays inside the drawer and focus goes back to the hamburger on close.
function MobileDrawer({ links, user, initials, urlQuery, onSlots, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();
  const panelRef = useRef(null);
  // Latest onClose in a ref: the setup effect below must run once per open, not on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector(FOCUSABLE)?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // Rotating a tablet or resizing past the breakpoint hides the hamburger, so the drawer must not stay open
    const wide = window.matchMedia(MOBILE_QUERY);
    const onResize = (event) => event.matches && onCloseRef.current();

    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onResize);
    };
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out.");
    onClose();
    navigate("/login", { replace: true });
  };

  return createPortal(
    <>
      <motion.div
        className="drawer-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={FAST}
      />
      <motion.aside
        id="mobile-drawer"
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={NORMAL}
      >
        <div className="drawer-head">
          <Link to="/" className="logo-button" aria-label="DarshanEase home" onClick={onClose}>
            <Logo />
          </Link>
          <button type="button" className="icon-button" aria-label="Close navigation" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <TopSearch onSlots={onSlots} urlQuery={urlQuery} onDone={onClose} />
        <nav className="drawer-links" aria-label="Main">
          {links.map((link) => (
            <Link key={link.to} className="drawer-link" to={link.to} onClick={onClose}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="drawer-actions">
          {user ? (
            <>
              <Link className="profile-button" to="/dashboard" onClick={onClose}>
                <span className="avatar">{initials}</span>
                <span className="drawer-profile">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </span>
              </Link>
              <button type="button" className="button button-secondary" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="button button-primary" to="/register" onClick={onClose}>
                Create account
              </Link>
              <Link className="button button-secondary" to="/login" onClick={onClose}>
                Log in
              </Link>
            </>
          )}
        </div>
      </motion.aside>
    </>,
    document.body
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  // The drawer stays open only on the page where it was opened, so a route change closes it
  const [openPath, setOpenPath] = useState(null);
  const drawerOpen = openPath === location.pathname;
  const menuButtonRef = useRef(null);
  const closeDrawer = () => {
    setOpenPath(null);
    menuButtonRef.current?.focus();
  };
  const links = [
    { to: "/slots", label: "Darshan Slots" },
    ...(user ? [{ to: "/bookings", label: "My Bookings" }] : []),
    ...(user?.role === "organizer" || user?.role === "admin" ? [{ to: "/organizer", label: "Organizer" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];
  const [searchParams] = useSearchParams();
  const onSlots = location.pathname === "/slots";
  const urlQuery = onSlots ? (searchParams.get("q") ?? "") : "";
  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="topbar">
      <motion.button
        {...tap}
        ref={menuButtonRef}
        className="mobile-menu"
        type="button"
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        aria-controls="mobile-drawer"
        onClick={() => setOpenPath(location.pathname)}
      >
        <MenuIcon />
      </motion.button>
      <Link to="/" className="logo-button" aria-label="DarshanEase home">
        <Logo />
      </Link>
      {links.map((link) => (
        <Link key={link.to} className="topbar-link" to={link.to}>
          {link.label}
        </Link>
      ))}
      <TopSearch onSlots={onSlots} urlQuery={urlQuery} />
      <div className="top-actions">
        <NotificationMenu key={user?._id ?? "guest"} />
        {user ? (
          <div className="profile-wrap">
            <Link className="profile-button" to="/dashboard" aria-label="Open your account">
              <span className="avatar">{initials}</span>
              <span className="profile-copy">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </Link>
          </div>
        ) : (
          <>
            <Link className="button button-ghost" to="/login">
              Log in
            </Link>
            <Link className="button button-primary" to="/register">
              Create account
            </Link>
          </>
        )}
      </div>
      <AnimatePresence>
        {drawerOpen && (
          <MobileDrawer
            links={links}
            user={user}
            initials={initials}
            urlQuery={urlQuery}
            onSlots={onSlots}
            onClose={closeDrawer}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
