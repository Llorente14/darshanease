import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Slots from "./pages/Slots";
import BookSlot from "./pages/BookSlot";
import ProtectedRoute, { SessionLoader } from "./components/ProtectedRoute";

// "/" -> /dashboard when authenticated, otherwise /login
function IndexRedirect() {
  const { token, loading } = useAuth();
  if (loading) return <SessionLoader />;
  return token ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
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
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/book/:slotId" element={<BookSlot />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
