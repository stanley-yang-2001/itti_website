import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Reveal from './Reveal.jsx';
import '../styles/Settings.css';

const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * All account-management UI (picture, name, password, session, delete
 * account) - shared between the standalone /settings page (Settings.jsx,
 * kept for existing links like PrivacyPolicy.jsx's "Settings" link) and
 * the Settings tab on the Profile page, so there's one place this logic
 * lives rather than two copies drifting apart.
 *
 * Every "Confirm" button here is disabled until its own section has an
 * actual, validly-formed change pending - not just enabled by default -
 * per section is its own independent form with its own dirty check:
 *   - Picture: disabled until a new file has been chosen.
 *   - Name: disabled until the trimmed value differs from the current name.
 *   - Password: disabled until current/new/confirm are all filled in,
 *     new/confirm match, and new meets the length requirement - so by
 *     the time it's clickable, submitting it should succeed.
 */
export default function SettingsPanel() {
  const { user, updateAccount, updatePicture, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ---- Profile picture ----
  const [selectedFile, setSelectedFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  const [pictureStatus, setPictureStatus] = useState(null);
  const [pictureSaving, setPictureSaving] = useState(false);

  // ---- Display name ----
  const [name, setName] = useState(user?.name || '');
  const [nameStatus, setNameStatus] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  // ---- Password ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  function handlePictureChange(e) {
    const file = e.target.files?.[0];
    setPictureStatus(null);
    if (!file) {
      setSelectedFile(null);
      setPicturePreview(null);
      return;
    }
    if (!ALLOWED_PICTURE_TYPES.includes(file.type)) {
      setPictureStatus({ type: 'error', message: 'Please choose a PNG, JPG, or WEBP image.' });
      setSelectedFile(null);
      setPicturePreview(null);
      return;
    }
    if (file.size > MAX_PICTURE_BYTES) {
      setPictureStatus({ type: 'error', message: 'Image must be under 5MB.' });
      setSelectedFile(null);
      setPicturePreview(null);
      return;
    }
    setSelectedFile(file);
    setPicturePreview(URL.createObjectURL(file));
  }

  function cancelPictureChange() {
    setSelectedFile(null);
    setPicturePreview(null);
    setPictureStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePictureConfirm() {
    if (!selectedFile) return;
    setPictureSaving(true);
    setPictureStatus(null);
    try {
      await updatePicture(selectedFile);
      setPictureStatus({ type: 'success', message: 'Profile picture updated' });
      setSelectedFile(null);
      setPicturePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setPictureStatus({ type: 'error', message: err.message });
    } finally {
      setPictureSaving(false);
    }
  }

  const trimmedName = name.trim();
  const nameChanged = trimmedName.length > 0 && trimmedName !== (user.name || '');

  async function handleNameSubmit(e) {
    e.preventDefault();
    if (!nameChanged) return;
    setNameSaving(true);
    setNameStatus(null);
    try {
      await updateAccount({ name: trimmedName });
      setNameStatus({ type: 'success', message: 'Name updated' });
    } catch (err) {
      setNameStatus({ type: 'error', message: err.message });
    } finally {
      setNameSaving(false);
    }
  }

  const passwordReady =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!passwordReady) return;
    setPasswordSaving(true);
    setPasswordStatus(null);
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
    <>
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

      {/* --- Profile picture --- */}
      <Reveal delay={60}>
        <section className="settings-section">
          <h3>Profile picture</h3>
          <div className="settings-picture-row">
            <div className="settings-picture-current">
              {picturePreview || user.picture_url ? (
                <img src={picturePreview || user.picture_url} alt={user.name || user.email} />
              ) : (
                <span>{initials(user.name, user.email)}</span>
              )}
            </div>
            <div className="settings-picture-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePictureChange}
              />
              <div className="settings-picture-actions">
                <button
                  type="button"
                  className="settings-btn"
                  disabled={!selectedFile || pictureSaving}
                  onClick={handlePictureConfirm}
                >
                  {pictureSaving ? 'Uploading…' : 'Confirm'}
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    className="settings-btn settings-btn--secondary"
                    onClick={cancelPictureChange}
                    disabled={pictureSaving}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="settings-hint">PNG, JPG, or WEBP. Up to 5MB.</p>
            </div>
          </div>
          {pictureStatus && (
            <p className={`settings-status settings-status--${pictureStatus.type}`}>{pictureStatus.message}</p>
          )}
        </section>
      </Reveal>

      {/* --- Change name --- */}
      <Reveal delay={120}>
        <section className="settings-section">
          <h3>Username</h3>
          <form onSubmit={handleNameSubmit} className="settings-form">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <button type="submit" className="settings-btn" disabled={!nameChanged || nameSaving}>
              {nameSaving ? 'Saving…' : 'Confirm'}
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
              <button type="submit" className="settings-btn" disabled={!passwordReady || passwordSaving}>
                {passwordSaving ? 'Saving…' : 'Confirm'}
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
      <Reveal delay={240}>
        <section className="settings-section">
          <h3>Session</h3>
          <button type="button" className="settings-btn settings-btn--secondary" onClick={handleLogout}>
            Log out
          </button>
        </section>
      </Reveal>

      {/* --- Danger zone --- */}
      <Reveal delay={300}>
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
    </>
  );
}