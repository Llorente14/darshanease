import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import Topbar from "../components/Topbar";
import Footer from "../components/Footer";

const FIELDS = ["email", "password"];

const INITIAL_VALUES = {
  email: "",
  password: "",
};

// Client-side validation: email format, password required (no strength rule on login)
function validateField(field, values) {
  const value = values[field] ?? "";
  switch (field) {
    case "email": {
      const v = value.trim();
      if (!v) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return "Please enter a valid email address";
      return "";
    }
    case "password": {
      if (!value) return "Password is required";
      return "";
    }
    default:
      return "";
  }
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function ArrowLeftIcon() {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear field error as soon as user edits
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    const message = validateField(name, values);
    setErrors((prev) => ({ ...prev, [name]: message }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || inFlight.current) return;

    // Validate on submit
    const nextErrors = {};
    for (const field of FIELDS) {
      const message = validateField(field, values);
      if (message) nextErrors[field] = message;
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setGeneralError("");
    inFlight.current = true;
    setSubmitting(true);

    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      });

      // Navigate to originally requested path or default to /dashboard
      const destination = location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    } catch (error) {
      const response = error?.response;

      if (response?.status === 401) {
        setGeneralError(
          response.data?.message || "Invalid email or password"
        );
      } else if (response?.status === 422 && Array.isArray(response.data?.errors)) {
        const fieldErrors = {};
        let unmapped = false;
        for (const item of response.data.errors) {
          if (FIELDS.includes(item.field)) {
            fieldErrors[item.field] = item.message;
          } else {
            unmapped = true;
          }
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        if (unmapped || Object.keys(fieldErrors).length === 0) {
          setGeneralError(
            response.data?.message || "Validation failed"
          );
        }
      } else if (response?.status === 429) {
        setGeneralError("Too many attempts, please try again later");
      } else if (response) {
        setGeneralError(
          response.data?.message || "Something went wrong. Please try again."
        );
      } else {
        setGeneralError(
          "Unable to reach the server. Please check your connection and try again."
        );
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="public-shell">
      <Topbar />
      <main className="auth-page">
        <div className="auth-visual">
          <div className="auth-quote">
            <SparkleIcon />
            <blockquote>
              “A thoughtful journey begins before you arrive.”
            </blockquote>
            <p>Plan with confidence, arrive with peace.</p>
          </div>
        </div>
        <div className="auth-panel">
          <Link className="back-link" to="/slots">
            <ArrowLeftIcon />
            Browse darshan slots
          </Link>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <span className="eyebrow">Welcome back</span>
            <h1>Continue your journey</h1>
            <p>Sign in to manage your darshan bookings.</p>

            {generalError && (
              <div className="feedback error" role="alert">
                <AlertIcon />
                {generalError}
              </div>
            )}

            <FormInput
              label="Email address"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
            />

            <PasswordInput
              label="Password"
              name="password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="At least 8 characters"
              autoComplete="current-password"
              error={errors.password}
            />

            <Button type="submit" className="wide" loading={submitting}>
              <LogInIcon />
              Sign in
            </Button>

            <p className="auth-switch">
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
