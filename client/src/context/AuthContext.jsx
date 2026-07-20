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
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
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

  /** fields: { name } and/or { current_password, new_password } */
  async function updateAccount(fields) {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.description || data.error || 'Update failed');
    }
    setUser(data);
    return data;
  }

  async function deleteAccount() {
    const res = await fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.description || data.error || 'Account deletion failed');
    }
    setUser(null);
    return data;
  }

  async function logout() {
    await postJson('/api/auth/logout', {}).catch(() => {}); // clear local state either way
    setUser(null);
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isPublisher: user?.role === 'publisher',
    loginWithGoogle,
    loginWithPassword,
    signup,
    updateAccount,
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