import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

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

export default function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return <SessionLoader />;
  }

  if (!token) {
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
}
