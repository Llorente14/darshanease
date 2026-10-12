import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationMenu from "./NotificationMenu";

export function Logo() {
  return (
    <span className="logo" aria-label="DarshanEase">
      <span className="logo-mark">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
          <path d="M4 17v2" />
          <path d="M5 18H3" />
        </svg>
      </span>
      <span>
        Darshan<span>Ease</span>
      </span>
    </span>
  );
}

export default function Topbar() {
  const { user } = useAuth();
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
      <div className="top-search">
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
        <input
          aria-label="Search"
          placeholder="Search temples, locations, bookings..."
        />
      </div>
      <div className="top-actions">
        <button className="icon-button" type="button" aria-label="Help">
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
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
        <NotificationMenu key={user?._id ?? "guest"} />
        {user ? (
          <div className="profile-wrap">
            <div className="profile-button">
              <span className="avatar">{initials}</span>
              <span className="profile-copy">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </div>
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
