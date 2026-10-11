import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  // While the persisted session is being restored, show a small loader
  if (loading) {
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

  if (!token) {
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
}
