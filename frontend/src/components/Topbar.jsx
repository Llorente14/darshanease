import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationMenu from "./NotificationMenu";

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
  const query = params.toString();
  return query ? `/slots?${query}` : "/slots";
};

// Navbar search. On /slots it filters live, like the filter bar: the list follows the input after a short pause.
// Elsewhere the search is sent on submit and opens /slots.
function TopSearch({ onSlots, urlQuery }) {
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

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
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
      <button className="mobile-menu" type="button" aria-label="Open navigation">
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      <Link to="/" className="logo-button" aria-label="DarshanEase home">
        <Logo />
      </Link>
      <Link className="topbar-link" to="/slots">
        Darshan Slots
      </Link>
      {user && (
        <Link className="topbar-link" to="/bookings">
          My Bookings
        </Link>
      )}
      {(user?.role === "organizer" || user?.role === "admin") && (
        <Link className="topbar-link" to="/organizer">
          Organizer
        </Link>
      )}
      {user?.role === "admin" && (
        <Link className="topbar-link" to="/admin">
          Admin
        </Link>
      )}
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
    </header>
  );
}
