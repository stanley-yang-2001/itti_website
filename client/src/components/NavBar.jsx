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
    setMenuOpen(false);
    navigate('/');
  }

  const links = isPublisher ? [...NAV_LINKS, { to: '/publish', label: 'Publish' }] : NAV_LINKS;
  const allLinks = isAdmin ? [...links, { to: '/admin/donations', label: 'Donations (Admin)' }] : links;

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-top">
        <Link to="/" className="navbar-brand">
          <img src="/itti-logo.png" alt="ITTI seal" className="navbar-logo" />
          <span className="navbar-title display">International Truth &amp; Trauma Institute</span>
        </Link>

        <div className="navbar-auth">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="navbar-user">
                {user.name || user.email}
                <span className={`role-badge role-${user.role}`}>{user.role}</span>
              </Link>
              <button className="navbar-auth-btn" onClick={handleLogout}>
                Log out
              </button>
            </>
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
        {allLinks.map((link) => (
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