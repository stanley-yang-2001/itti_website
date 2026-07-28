import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Reveal from '../components/Reveal.jsx';
import "../styles/Login.css";

/**
 * Requests a password reset email. Always shows the same success
 * message regardless of whether the email is registered - the backend
 * deliberately doesn't reveal which emails have accounts (see
 * /api/auth/forgot-password in app.py).
 */
export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Reveal delay={0}>
      <div className="login-card">
        <h1>Reset your password</h1>

        {submitted ? (
          <p className="login-status">
            If an account exists for <strong>{email}</strong>, a password reset link has been
            sent. Check your inbox.
          </p>
        ) : (
          <>
            <p className="login-status">
              Enter the email on your account and we&rsquo;ll send a link to reset your password.
            </p>

            {error && <p className="login-error">{error}</p>}

            <form className="login-password-form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <button type="submit" className="login-submit-button" disabled={loading}>
                Send reset link
              </button>
            </form>
          </>
        )}

        <p className="login-signup-link">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
      </Reveal>
    </div>
  );
}