import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import Topbar from "../components/Topbar";
import Footer from "../components/Footer";

const FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "password",
  "confirmPassword",
];

const INITIAL_VALUES = {
  name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  confirmPassword: "",
};

// Client-side rules mirroring the backend validation
function validateField(field, values) {
  const value = values[field] ?? "";
  switch (field) {
    case "name": {
      const v = value.trim();
      if (!v) return "Name is required";
      if (v.length < 2) return "Name must be at least 2 characters";
      if (v.length > 100) return "Name must be at most 100 characters";
      return "";
    }
    case "email": {
      const v = value.trim();
      if (!v) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return "Please enter a valid email address";
      return "";
    }
    case "phone": {
      const v = value.replace(/[\s-]/g, "");
      if (!v) return "Phone is required";
      if (!/^\+?[0-9]{9,15}$/.test(v))
        return "Phone must be 9-15 digits, optionally starting with +";
      return "";
    }
    case "address": {
      const v = value.trim();
      if (!v) return "Address is required";
      if (v.length < 5) return "Address must be at least 5 characters";
      if (v.length > 255) return "Address must be at most 255 characters";
      return "";
    }
    case "password": {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      if (!/[A-Za-z]/.test(value))
        return "Password must contain at least 1 letter";
      if (!/[0-9]/.test(value)) return "Password must contain at least 1 number";
      return "";
    }
    case "confirmPassword": {
      if (!value) return "Please confirm your password";
      if (value !== values.password) return "Passwords do not match";
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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear the field error as soon as the user edits it
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    const message = validateField(name, values);
    setErrors((prev) => ({ ...prev, [name]: message }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return; // guard against double submit

    // Validate every field first — never send an invalid request
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
    setSubmitting(true);
    try {
      // Allowlist of fields — never send role or confirmPassword
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone,
        address: values.address.trim(),
        password: values.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const response = error?.response;
      if (
        response &&
        (response.status === 409 || response.status === 422) &&
        Array.isArray(response.data?.errors)
      ) {
        const fieldErrors = {};
        let unmapped = false;
        for (const item of response.data.errors) {
          if (FIELDS.includes(item.field)) fieldErrors[item.field] = item.message;
          else unmapped = true;
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        if (unmapped || Object.keys(fieldErrors).length === 0) {
          setGeneralError(
            response.data?.message || "Something went wrong. Please try again."
          );
        }
      } else if (response?.status === 429) {
        setGeneralError(
          "Too many attempts. Please wait about 15 minutes and try again."
        );
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
          <Link className="back-link" to="/">
            <ArrowLeftIcon />
            Back to home
          </Link>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <span className="eyebrow">Join DarshanEase</span>
            <h1>Create your account</h1>
            <p>One account for simpler temple visits.</p>
            {generalError && (
              <div className="feedback error" role="alert">
                <AlertIcon />
                {generalError}
              </div>
            )}
            <FormInput
              label="Full name"
              name="name"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Your full name"
              autoComplete="name"
              maxLength={100}
              error={errors.name}
            />
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
            <div className="two-col">
              <FormInput
                label="Phone number"
                name="phone"
                type="tel"
                value={values.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="+1 234 567 890"
                autoComplete="tel"
                error={errors.phone}
              />
              <FormInput
                label="Address"
                name="address"
                value={values.address}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="City, district"
                autoComplete="street-address"
                maxLength={255}
                error={errors.address}
              />
            </div>
            <PasswordInput
              label="Password"
              name="password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={errors.password}
            />
            <PasswordInput
              label="Confirm password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirmPassword}
            />
            <Button type="submit" className="wide" loading={submitting}>
              Create account
            </Button>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
