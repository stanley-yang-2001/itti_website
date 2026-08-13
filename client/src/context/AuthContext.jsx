import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include', // send/receive the Flask session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || `Request to ${path} failed`);
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The session lives in a cookie the browser already holds (if any) —
  // on load we just ask the server who that cookie belongs to. This is
  // what makes NavBar (and everything else) reflect login state without
  // each page having to fetch /me itself.
  //
  // cache: 'no-store' is explicit defense-in-depth on top of the
  // server's own Cache-Control: no-store (see app.py) - without either
  // one, a shared cache sitting in front of the API that doesn't itself
  // vary on the session cookie could serve one visitor's cached
  // /api/auth/me response to a completely different visitor, which from
  // here looks identical to "being logged into someone else's account."
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  /** credential = the ID token string from Google's <GoogleLogin onSuccess>. */
  async function loginWithGoogle(credential) {
    const data = await postJson('/api/auth/google', { credential });
    setUser(data);
    return data;
  }

  async function loginWithPassword(email, password) {
    const data = await postJson('/api/auth/login', { email, password });
    setUser(data);
    return data;
  }

  async function signup(name, email, password) {
    // Server always creates ROLE_BASIC accounts here — see
    // server/models/user.py and docs/ACCESS_LEVELS.md.
    const data = await postJson('/api/auth/signup', { name, email, password });
    setUser(data);
    return data;
  }

  /** Always resolves with a generic message, regardless of whether the email exists. Sends a 6-digit code. */
  async function requestPasswordReset(email) {
    return postJson('/api/auth/forgot-password', { email });
  }

  /** Invalidates the last code and sends a fresh one to the same email. Same generic-message shape. */
  async function resendPasswordResetCode(email) {
    return postJson('/api/auth/forgot-password/resend', { email });
  }

  /** Invalidates any outstanding code for this email - call when the user goes back to re-enter their email. */
  async function cancelPasswordReset(email) {
    return postJson('/api/auth/forgot-password/back', { email }).catch(() => {}); // best-effort, never blocks navigation
  }

  /** Resolves with the user and logs them in, since a correct code proves account ownership. */
  async function verifyPasswordResetCode(email, code) {
    const data = await postJson('/api/auth/forgot-password/verify', { email, code });
    setUser(data);
    return data;
  }

  /**
   * Legacy path: redeems a token from a reset link emailed before this
   * deploy (see ResetPassword.jsx and reset_password()'s docstring in
   * app.py). New reset requests never generate these links anymore -
   * this only exists so an already-sent email still works.
   */
  async function resetPassword(token, password) {
    const data = await postJson('/api/auth/reset-password', { token, password });
    setUser(data);
    return data;
  }

  async function logout() {
    await postJson('/api/auth/logout', {}).catch(() => {}); // clear local state either way
    setUser(null);
  }

  /** fields: { name?, current_password?, new_password? } - each is independent, see server/app.py. */
  async function updateAccount(fields) {
    const data = await postJson('/api/auth/update-profile', fields);
    setUser(data);
    return data;
  }

  /** file: a File/Blob from an <input type="file">. */
  async function updatePicture(file) {
    const formData = new FormData();
    formData.append('picture', file);
    const res = await fetch('/api/auth/update-picture', {
      method: 'POST',
      credentials: 'include',
      body: formData, // no Content-Type header - the browser sets the multipart boundary itself
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.description || data.error || 'Failed to update picture');
    }
    setUser(data);
    return data;
  }

  async function deleteAccount() {
    const res = await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.description || data.error || 'Failed to delete account');
    }
    setUser(null);
    return data;
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    // Matches the backend's @roles_required("publisher", "admin") pattern
    // used on every route this flag gates client-side (uploading
    // documents/reports, the globe-data workbook upload) - admin can do
    // everything publisher can, so this has to be true for both roles,
    // not just a literal role === 'publisher' check.
    isPublisher: user?.role === 'publisher' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
    loginWithGoogle,
    loginWithPassword,
    signup,
    requestPasswordReset,
    resendPasswordResetCode,
    cancelPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    updateAccount,
    updatePicture,
    deleteAccount,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}