import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext.jsx";
import { checkEmail, checkPassword, checkPasswordsMatch, checkName } from "../utils/formValidation.js";
import "../styles/SignUp.css";

/**
 * Sign-up page for creating an account with name/email/password.
 * Google Sign-In is also offered here for anyone who changes their mind,
 * mirroring the option on /login.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};

    const nameError = checkName(name);
    if (nameError) errors.name = nameError;

    const emailError = checkEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = checkPassword(password);
    if (passwordError) errors.password = passwordError;

    const matchError = checkPasswordsMatch(password, confirmPassword);
    if (matchError) errors.confirmPassword = matchError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password);
      navigate("/");
    } catch (err) {
      if (err.message.includes("already exists")) {
        setFormError("An account with this email already exists.");
      } else {
        setFormError(err.message || "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setFormError(null);
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
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