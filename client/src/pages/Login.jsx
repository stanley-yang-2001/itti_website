.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'Times New Roman', Times, serif;
}

.login-card {
  background: #fff;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 360px;
  text-align: center;
  color: #1B2431;
}

.login-card h1 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #14213D;
}

.login-google {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.login-divider {
  display: flex;
  align-items: center;
  color: #5B6472;
  font-size: 0.85rem;
  margin: 1rem 0;
}

.login-divider::before,
.login-divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.login-divider span {
  padding: 0 0.75rem;
}

.login-signup-button {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  color: #1B2431;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
}

.login-signup-button:hover {
  background: #f0f0f0;
}

.login-error {
  color: #A82A20;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.login-status {
  color: #3D4652;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.login-password-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  text-align: left;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #2B3440;
}

.login-field input {
  padding: 0.55rem 0.7rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  color: #14213D;
  background: #fff;
}

.login-submit-button {
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: 6px;
  background: #14213D;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.login-submit-button:hover {
  opacity: 0.9;
}

.login-submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-forgot-link {
  margin: -0.5rem 0 0 0;
  text-align: right;
  font-size: 0.8rem;
}

.login-forgot-link a {
  color: #3D4652;
  text-decoration: none;
}

.login-forgot-link a:hover {
  text-decoration: underline;
}

.login-signup-link {
  margin: 1.25rem 0 0 0;
  font-size: 0.85rem;
  color: #3D4652;
}

.login-signup-link a {
  color: #14213D;
  font-weight: 600;
  text-decoration: none;
}

.login-signup-link a:hover {
  text-decoration: underline;
}