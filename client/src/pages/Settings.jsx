import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Reveal from '../components/Reveal.jsx';
import '../styles/Settings.css';

export default function Settings() {
  const { user, isAuthenticated, loading: authLoading, updateAccount, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [nameStatus, setNameStatus] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="settings-page">
        <div className="settings-denied">
          <h1>You need to be logged in to view Settings</h1>
          <p>Log in to manage your account.</p>
        </div>
      </div>
    );
  }

  async function handleNameSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameStatus({ type: 'error', message: 'Name cannot be empty' });
      return;
    }
    setNameSaving(true);
    setNameStatus(null);
    try {
      await updateAccount({ name: trimmed });
      setNameStatus({ type: 'success', message: 'Name updated' });
    } catch (err) {
      setNameStatus({ type: 'error', message: err.message });
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    setPasswordSaving(true);
    try {
      await updateAccount({ current_password: currentPassword, new_password: newPassword });
      setPasswordStatus({ type: 'success', message: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteStatus(null);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err.message });
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="settings-page">
      <h2 className="display">Settings</h2>
      <p>Manage your account.</p>

      {/* --- Account overview --- */}
      <Reveal delay={0}>
      <section className="settings-section">
        <h3>Account</h3>
        <div className="settings-info-grid">
          <div className="settings-info-row">
            <span className="settings-info-label">Email</span>
            <span className="settings-info-value">{user.email}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Access level</span>
            <span className={`role-badge${user.role === 'publisher' ? ' role-publisher' : ''}`}>
              {user.role}
            </span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Sign-in method</span>
            <span className="settings-info-value">
              {user.google_linked && user.has_password
                ? 'Google + password'
                : user.google_linked
                ? 'Google'
                : 'Email + password'}
            </span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Member since</span>
            <span className="settings-info-value">
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </section>
      </Reveal>

      {/* --- Change name --- */}
      <Reveal delay={90}>
      <section className="settings-section">
        <h3>Display name</h3>
        <form onSubmit={handleNameSubmit} className="settings-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button type="submit" className="settings-btn" disabled={nameSaving}>
            {nameSaving ? 'Saving…' : 'Save name'}
          </button>
        </form>
        {nameStatus && (
          <p className={`settings-status settings-status--${nameStatus.type}`}>{nameStatus.message}</p>
        )}
      </section>
      </Reveal>

      {/* --- Change password (only if the account actually has one) --- */}
      <Reveal delay={180}>
      <section className="settings-section">
        <h3>Password</h3>
        {user.has_password ? (
          <form onSubmit={handlePasswordSubmit} className="settings-form settings-form--stacked">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button type="submit" className="settings-btn" disabled={passwordSaving}>
              {passwordSaving ? 'Saving…' : 'Change password'}
            </button>
          </form>
        ) : (
          <p className="settings-muted">
            This account signs in with Google and doesn't have a separate password to change.
          </p>
        )}
        {passwordStatus && (
          <p className={`settings-status settings-status--${passwordStatus.type}`}>{passwordStatus.message}</p>
        )}
      </section>
      </Reveal>

      {/* --- Session --- */}
      <Reveal delay={270}>
      <section className="settings-section">
        <h3>Session</h3>
        <button type="button" className="settings-btn settings-btn--secondary" onClick={handleLogout}>
          Log out
        </button>
      </section>
      </Reveal>

      {/* --- Danger zone --- */}
      <Reveal delay={360}>
      <section className="settings-section settings-section--danger">
        <h3>Delete account</h3>
        <p className="settings-muted">
          This hides your account and signs you out. Your documents and activity history are kept, not erased.
        </p>
        {!deleteConfirmOpen ? (
          <button
            type="button"
            className="settings-btn settings-btn--danger"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete my account
          </button>
        ) : (
          <div className="settings-delete-confirm">
            <p>Are you sure? This can't be undone from your account — you'd need to contact an administrator to restore it.</p>
            <div className="settings-delete-confirm-actions">
              <button
                type="button"
                className="settings-btn settings-btn--danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteStatus && (
          <p className={`settings-status settings-status--${deleteStatus.type}`}>{deleteStatus.message}</p>
        )}
      </section>
      </Reveal>
    </div>
  );
}