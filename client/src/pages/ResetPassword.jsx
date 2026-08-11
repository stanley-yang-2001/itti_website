import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { checkPassword, checkPasswordsMatch } from "../utils/formValidation.js";
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import "../styles/Login.css";

/**
 * Redeems a reset token (from the emailed link's ?token=... query
 * param) and sets a new password. On success the user is logged in
 * immediately - see resetPassword() in AuthContext.jsx.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Same live "do these match yet?" feedback as the sign-up page, rather
  // than only finding out after submitting.
  const confirmPasswordHint =
    confirmPassword.length === 0
      ? null
      : password === confirmPassword
      ? { text: 'Passwords match', kind: 'match' }
      : { text: 'Passwords do not match', kind: 'mismatch' };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const passwordError = checkPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const matchError = checkPasswordsMatch(password, confirmPassword);
    if (matchError) {
      setError(matchError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="login-page">
      <SEO
        path="/reset-password"
        title="Reset Password"
        description="Choose a new password for your International Truth & Trauma Institute account."
        noindex
      />
        <Reveal delay={0}>
        <div className="login-card">
          <h1>Reset your password</h1>
          <p className="login-error">
            This page needs a reset link from your email - the link in your browser is missing
            its token.
          </p>
          <p className="login-signup-link">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="login-page">
      <SEO
        path="/reset-password"
        title="Reset Password"
        description="Choose a new password for your International Truth & Trauma Institute account."
        noindex
      />
      <Reveal delay={0}>
      <div className="login-card">
        <h1>Choose a new password</h1>

        {error && <p className="login-error">{error}</p>}

        <form className="login-password-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="login-field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {confirmPasswordHint && (
              <span className={`login-field-hint ${confirmPasswordHint.kind}`}>
                {confirmPasswordHint.text}
              </span>
            )}
          </label>
          <button type="submit" className="login-submit-button" disabled={loading}>
            Reset password
          </button>
        </form>

        <p className="login-signup-link">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
      </Reveal>
    </div>
  );
}