import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import "../styles/Login.css";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Second step of the password-reset flow: the user enters the 6-digit
 * code emailed by /api/auth/forgot-password. Reached only via
 * ForgotPassword.jsx's navigate() with { state: { email } } - if
 * someone lands here directly (no email in location.state, e.g. a
 * refresh), send them back to start over rather than showing a broken
 * form with nothing to verify against.
 *
 * On a correct code, the server logs the user in immediately (see
 * verify_reset_code() in app.py) and this navigates straight to the
 * Settings tab of the Profile page so they can actually change their
 * password - see SettingsPanel.jsx's Password section.
 */
export default function VerifyResetCode() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyPasswordResetCode, resendPasswordResetCode, cancelPasswordReset } = useAuth();
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  if (!email) {
    return (
      <div className="login-page">
        <SEO path="/reset-password/verify" title="Verify Code" noindex />
        <Reveal delay={0}>
        <div className="login-card">
          <h1>Enter verification code</h1>
          <p className="login-error">
            This page needs to know which email you requested a code for.
          </p>
          <p className="login-signup-link">
            <Link to="/forgot-password">Start over</Link>
          </p>
        </div>
        </Reveal>
      </div>
    );
  }

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleDigitChange(index, rawValue) {
    // Support pasting the whole code into any box at once.
    const pasted = rawValue.replace(/\D/g, "");
    if (pasted.length > 1) {
      const next = Array(CODE_LENGTH).fill("");
      for (let i = 0; i < pasted.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = pasted[i];
      }
      setDigits(next);
      const lastFilled = Math.min(index + pasted.length, CODE_LENGTH) - 1;
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    const value = rawValue.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  const code = digits.join("");
  const codeComplete = code.length === CODE_LENGTH;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!codeComplete) {
      setError("Enter all 6 digits of the code.");
      return;
    }

    setLoading(true);
    try {
      await verifyPasswordResetCode(email, code);
      // Correct code proves ownership and logs the user in server-side
      // (see verify_reset_code() in app.py) - land them straight on the
      // Settings tab to change their password.
      navigate("/profile#settings", { replace: true, state: { fromReset: true } });
    } catch (err) {
      setError(err.message || "That code doesn't match. Please check it and try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResendStatus(null);
    setError(null);
    setResending(true);
    try {
      await resendPasswordResetCode(email);
      setResendStatus("A new code has been sent. Your previous code no longer works.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      startCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  function handleBack() {
    cancelPasswordReset(email);
    navigate("/forgot-password", { replace: true });
  }

  return (
    <div className="login-page">
      <SEO
        path="/reset-password/verify"
        title="Verify Code"
        description="Enter the verification code sent to your email."
        noindex
      />
      <Reveal delay={0}>
      <div className="login-card">
        <h1>Enter verification code</h1>
        <p className="login-status">
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below - it expires in 10
          minutes.
        </p>

        {error && <p className="login-error">{error}</p>}
        {resendStatus && !error && <p className="login-status login-field-hint match">{resendStatus}</p>}

        <form className="login-password-form" onSubmit={handleSubmit}>
          <div className="code-input-row">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="code-input-box"
                aria-label={`Digit ${index + 1} of verification code`}
              />
            ))}
          </div>
          <button type="submit" className="login-submit-button" disabled={!codeComplete || loading}>
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
        </form>

        <p className="login-status login-resend-row">
          Didn&rsquo;t get a code?{' '}
          <button
            type="button"
            className="login-link-button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
          </button>
        </p>

        <p className="login-signup-link">
          <button type="button" className="login-link-button" onClick={handleBack}>
            Wrong email? Go back
          </button>
        </p>
      </div>
      </Reveal>
    </div>
  );
}