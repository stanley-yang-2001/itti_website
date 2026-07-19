import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/Signup.css";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Sign-up page for creating an account with name/email/password.
 * Google Sign-In is also offered here for anyone who changes their mind,
 * mirroring the option on /login.
 */
export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include", // send/receive the session cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error("An account with this email already exists.");
        }
        throw new Error(body.description || "Sign up failed. Please try again.");
      }

      // Adjust this to whatever your app does after account creation —
      // e.g. store user in context, then redirect to a dashboard.
      navigate("/");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setFormError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.description || "Google sign-in failed");
      }

      navigate("/");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setFormError("Google sign-in was cancelled or failed. Please try again.");
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>Create an account</h1>

        {formError && <p className="signup-error">{formError}</p>}
        {loading && <p className="signup-status">Just a moment…</p>}

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <label className="signup-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            {fieldErrors.name && <span className="signup-field-error">{fieldErrors.name}</span>}
          </label>

          <label className="signup-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="signup-field-error">{fieldErrors.email}</span>}
          </label>

          <label className="signup-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.password && <span className="signup-field-error">{fieldErrors.password}</span>}
          </label>

          <label className="signup-field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <span className="signup-field-error">{fieldErrors.confirmPassword}</span>
            )}
          </label>

          <button type="submit" className="signup-submit-button" disabled={loading}>
            Create account
          </button>
        </form>

        <div className="signup-divider">
          <span>or</span>
        </div>

        <div className="signup-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
          />
        </div>

        <p className="signup-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}