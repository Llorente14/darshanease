import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Logo } from "./Topbar";

// Every item is a real route. The account column follows the session: guests see log in / register.
export default function Footer() {
  const { user } = useAuth();

  return (
    <footer>
      <div>
        <Logo />
        <p>A simpler, calmer way to plan every darshan.</p>
      </div>
      <div>
        <strong>Explore</strong>
        <Link to="/slots">Find darshan</Link>
      </div>
      <div>
        <strong>Account</strong>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/bookings">My bookings</Link>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
          </>
        )}
      </div>
      <p>© 2026 DarshanEase. All rights reserved.</p>
    </footer>
  );
}
