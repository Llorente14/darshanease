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
        <button type="button">Find darshan</button>
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
