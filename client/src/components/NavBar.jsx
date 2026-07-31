import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/observatory', label: 'Observatory' },
  { to: '/reports', label: 'Reports' },
  { to: '/country-profiles', label: 'Country Profiles' },
  { to: '/fellows', label: 'Fellowship' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/contact', label: 'Contact' }
];

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Everything account-related lives behind this one menu instead of
 * being scattered across the main nav or only reachable by already
 * knowing the URL: Publish and "Donations (Admin)" used to be (or, in
 * Settings/PublisherDashboard's case, never were) top-level nav items;
 * now Profile, Settings, Publisher Dashboard, and Admin Donations are
 * all one click away from the same place.
 */
function UserMenu({ user, isPublisher, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="navbar-user-menu" ref={menuRef}>
      <button
        type="button"
        className="navbar-user"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="navbar-user-avatar">
          {user.picture_url ? <img src={user.picture_url} alt="" /> : <span>{initials(user.name, user.email)}</span>}
        </span>
        <span className="navbar-user-name">{user.name || user.email}</span>
        <span className={`role-badge role-${user.role}`}>{user.role}</span>
        <span className={`navbar-user-caret${open ? ' open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="navbar-user-dropdown" role="menu">
          <div className="navbar-user-dropdown-head">
            <span className="navbar-user-dropdown-name">{user.name || 'Account'}</span>
            <span className="navbar-user-dropdown-email">{user.email}</span>
          </div>

          <Link to="/profile" className="navbar-user-dropdown-link" role="menuitem" onClick={() => setOpen(false)}>
            View Profile
          </Link>
          <Link to="/settings" className="navbar-user-dropdown-link" role="menuitem" onClick={() => setOpen(false)}>
            Account Settings
          </Link>

          {isPublisher && (
            <>
              <div className="navbar-user-dropdown-divider" />
              <Link to="/publisher" className="navbar-user-dropdown-link" role="menuitem" onClick={() => setOpen(false)}>
                Publisher Dashboard
              </Link>
            </>
          )}

          {isAdmin && (
            <Link to="/admin/donations" className="navbar-user-dropdown-link" role="menuitem" onClick={() => setOpen(false)}>
              Donations (Admin)
            </Link>
          )}

          <div className="navbar-user-dropdown-divider" />
          <button
            type="button"
            className="navbar-user-dropdown-link navbar-user-dropdown-logout"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isPublisher, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(null);

  // The navbar's height changes on mobile (menu open/closed), and it's
  // sticky - so anything else on the page that also needs to stick below
  // it (e.g. the letter grid on Country Profiles) reads this variable
  // instead of a hardcoded pixel offset.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    function updateHeight() {
      document.documentElement.style.setProperty('--navbar-height', `${el.offsetHeight}px`);
    }

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-top">
        <Link to="/" className="navbar-brand">
          <img src="/itti-logo.png" alt="ITTI seal" className="navbar-logo" />
          <span className="navbar-title display">International Truth &amp; Trauma Institute</span>
        </Link>

        <div className="navbar-auth">
          {isAuthenticated ? (
            <UserMenu user={user} isPublisher={isPublisher} isAdmin={isAdmin} onLogout={handleLogout} />
          ) : (
            <>
              <NavLink to="/login" className="navbar-auth-btn">
                Log in
              </NavLink>
              <NavLink to="/signup" className="navbar-auth-btn primary">
                Sign up
              </NavLink>
            </>
          )}

          <NavLink
            to="/donate"
            className={({ isActive }) => 'navbar-auth-btn navbar-donate-btn' + (isActive ? ' active' : '')}
            onClick={() => setMenuOpen(false)}
          >
            Donate
          </NavLink>

          <button
            className="navbar-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}