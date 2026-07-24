import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/observatory', label: 'Observatory' },
  { to: '/reports', label: 'Reports' },
  { to: '/country-profiles', label: 'Country Profiles' },
  { to: '/fellows', label: 'Fellows' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/contact', label: 'Contact' }
];

// Titles for routes that aren't in NAV_LINKS but still need a page name
// shown in the navbar (auth pages, the publisher-only page, etc).
const EXTRA_PAGE_TITLES = {
  '/login': 'Log In',
  '/signup': 'Sign Up',
  '/forgot-password': 'Reset Password',
  '/reset-password': 'Reset Password',
  '/publish': 'Publish',
  '/unavailable': 'Unavailable'
};

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isPublisher, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  // The navbar's height changes per page (page title row present or not)
  // and on mobile (menu open/closed), and it's now sticky - so anything
  // else on the page that also needs to stick below it (e.g. the letter
  // grid on Country Profiles) reads this variable instead of a hardcoded
  // pixel offset.
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
  }, [menuOpen, location.pathname]);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate('/');
  }

  const links = isPublisher ? [...NAV_LINKS, { to: '/publish', label: 'Publish' }] : NAV_LINKS;

  const currentPageTitle =
    links.find((link) => link.to === location.pathname)?.label ??
    EXTRA_PAGE_TITLES[location.pathname] ??
    null;

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-top">
        <Link to="/" className="navbar-brand">
          <img src="/itti-logo.png" alt="ITTI seal" className="navbar-logo" />
          <span className="navbar-title display">ITTI</span>
        </Link>

        <div className="navbar-auth">
          {isAuthenticated ? (
            <>
              <span className="navbar-user">
                {user.name || user.email}
                <span className={`role-badge role-${user.role}`}>{user.role}</span>
              </span>
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

      {currentPageTitle && <div className="navbar-page-title">{currentPageTitle}</div>}

      <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
        {links.map((link) => (
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