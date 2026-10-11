import { Link } from "react-router-dom";
import { Logo } from "./Topbar";

export default function Footer() {
  return (
    <footer>
      <div>
        <Logo />
        <p>A simpler, calmer way to plan every darshan.</p>
      </div>
      <div>
        <strong>Explore</strong>
        <Link to="/slots">Find darshan</Link>
        <button type="button">How it works</button>
      </div>
      <div>
        <strong>Support</strong>
        <button type="button">Help centre</button>
        <button type="button">Accessibility</button>
      </div>
      <p>© 2025 DarshanEase. Sample product experience.</p>
    </footer>
  );
}
