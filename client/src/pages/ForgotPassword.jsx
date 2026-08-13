import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { checkEmail } from "../utils/formValidation.js";
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import "../styles/Login.css";

/**
 * Requests a password reset verification code. Always advances to the
 * "enter your code" screen (/reset-password/verify) regardless of
 * whether the email is registered - the backend deliberately doesn't
 * reveal which emails have accounts (see /api/auth/forgot-password in
 * app.py), so the frontend can't reveal it either by branching on the
 * result here.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const emailError = checkEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      navigate("/reset-password/verify", { state: { email }, replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <SEO
        path="/forgot-password"
        title="Forgot Password"
        description="Reset your International Truth & Trauma Institute account password."
        noindex
      />
      <Reveal delay={0}>
      <div className="login-card">
        <h1>Reset your password</h1>

        <p className="login-status">
          Enter the email on your account and we&rsquo;ll send you a verification code.
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
            {loading ? 'Sending…' : 'Send verification code'}
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