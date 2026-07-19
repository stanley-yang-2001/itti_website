import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/Login.css";

/**
 * Login page. Google Sign-In is one option; users who don't want to use
 * Google are sent to /signup (a separate page, not yet built) to create
 * an account another way (e.g. email/password).
 */
export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(credentialResponse) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include", // send/receive the session cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.description || "Google sign-in failed");
      }

      const user = await res.json();
      // Adjust this to whatever your app does after login —
      // e.g. store user in context, then redirect to a dashboard.
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Google sign-in was cancelled or failed. Please try again.");
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>

        {error && <p className="login-error">{error}</p>}
        {loading && <p className="login-status">Signing you in…</p>}

        <div className="login-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
          />
        </div>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-signup-button"
          onClick={() => navigate("/signup")}
        >
          Create an account with email
        </button>
      </div>
    </div>
  );
}