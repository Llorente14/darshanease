import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "../components/Button";
import Topbar from "../components/Topbar";

function DashboardIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function LogoutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function SparkleIcon() {
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
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function todayLabel() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  return `${weekday}, ${now.getDate()} ${month}`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const firstName = (user?.name || "Devotee").trim().split(/\s+/)[0];

  const handleLogout = () => {
    logout();
    navigate("/register", { replace: true });
  };

  return (
    <div className="app-shell">
      <Topbar />
      <aside className="sidebar">
        <span className="sidebar-label">Menu</span>
        <nav>
          <button type="button" className="active">
            <span className="nav-indicator" />
            <DashboardIcon />
            <span>Overview</span>
          </button>
        </nav>
        <span className="sidebar-spacer" />
      </aside>
      <main className="app-main">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow light">{todayLabel()}</span>
            <h1>Namaste, {firstName}.</h1>
            <p>
              Your DarshanEase account is ready. Here is everything we know
              about you.
            </p>
          </div>
          <div className="banner-art">
            <SparkleIcon />
          </div>
        </section>
        <div className="dashboard-grid">
          <section>
            <div className="section-title">
              <div>
                <span className="eyebrow">Your account</span>
                <h2>Account information</h2>
              </div>
            </div>
            <article className="form-card">
              <div className="summary-lines">
                <p>
                  <span>Name</span>
                  <strong>{user?.name || "—"}</strong>
                </p>
                <p>
                  <span>Email</span>
                  <strong>{user?.email || "—"}</strong>
                </p>
                <p>
                  <span>Phone</span>
                  <strong>{user?.phone || "—"}</strong>
                </p>
                <p>
                  <span>Address</span>
                  <strong>{user?.address || "—"}</strong>
                </p>
                <p>
                  <span>Role</span>
                  <strong style={{ textTransform: "capitalize" }}>
                    {user?.role || "devotee"}
                  </strong>
                </p>
              </div>
              <div className="divider" />
              <Button variant="secondary" onClick={handleLogout}>
                <LogoutIcon />
                Log out
              </Button>
            </article>
          </section>
          <aside className="dashboard-aside">
            <div className="aside-card devotional">
              <span className="eyebrow">A moment of calm</span>
              <SparkleIcon />
              <blockquote>
                “Peace comes from within. Let your journey begin there.”
              </blockquote>
            </div>
          </aside>
        </div>
      </main>
      <nav className="mobile-nav">
        <button type="button" className="active">
          <DashboardIcon />
          <span>Overview</span>
        </button>
      </nav>
    </div>
  );
}
