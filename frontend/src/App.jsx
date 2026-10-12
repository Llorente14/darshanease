import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Slots from "./pages/Slots";
import TempleDetail from "./pages/TempleDetail";
import BookSlot from "./pages/BookSlot";
import BookingConfirmation from "./pages/BookingConfirmation";
import MyBookings from "./pages/MyBookings";
import OrganizerTemples from "./pages/OrganizerTemples";
import AdminUsers from "./pages/AdminUsers";
import ProtectedRoute, { SessionLoader } from "./components/ProtectedRoute";

// "/" -> /dashboard when authenticated, otherwise /login
// "/" -> /dashboard when logged in, otherwise the public darshan slot list (guests browse before signing in)
function IndexRedirect() {
  const { token, loading } = useAuth();
  if (loading) return <SessionLoader />;
  return token ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/slots" replace />
  );
}

// "/login" -> back to the page that required login (state.from), else /dashboard, when authenticated
function LoginRoute() {
  const { token, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoader />;
  return token ? (
    <Navigate to={location.state?.from || "/dashboard"} replace />
  ) : (
    <Login />
  );
}

// "/register" -> /dashboard when already authenticated
function RegisterRoute() {
  const { token, loading } = useAuth();
  if (loading) return <SessionLoader />;
  return token ? <Navigate to="/dashboard" replace /> : <Register />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/slots" element={<Slots />} />
      <Route path="/temples/:id" element={<TempleDetail />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/book/:slotId" element={<BookSlot />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:bookingId" element={<BookingConfirmation />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["organizer", "admin"]} />}>
        <Route path="/organizer" element={<OrganizerTemples />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
