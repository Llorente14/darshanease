import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "./Button";
import Topbar from "./Topbar";
import Footer from "./Footer";

// Small full-page loader shown while the persisted session is restored
export function SessionLoader() {
  return (
    <div className="loading-state">
      <span className="spin">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </span>
      Loading your session...
    </div>
  );
}

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <SessionLoader />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return (
        <div className="public-shell">
          <Topbar />
          <main
            style={{
              minHeight: "calc(100vh - 170px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 20px",
              paddingTop: "90px",
            }}
          >
            <div className="state-card" style={{ maxWidth: 480, width: "100%" }}>
              <div
                className="state-icon"
                style={{ color: "var(--red)", background: "var(--red-soft)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <h2>403 - Access denied</h2>
              <p>You do not have permission to access this page.</p>
              <Button onClick={() => navigate("/dashboard")}>
                Back to dashboard
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
  }

  return <Outlet />;
}
