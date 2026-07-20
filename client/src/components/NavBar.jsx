import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About ITTI' },
  { to: '/observatory', label: 'Observatory' },
  { to: '/reports', label: 'Reports' },
  { to: '/country-profiles', label: 'Country Profiles' },
  { to: '/fellows', label: 'Fellows' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/contact', label: 'Contact' }
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, isPublisher, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate('/');
  }

  // Non-publishers (including guests) still need a way to find the
  // globe-data upload page, since visiting it directly shows them a
  // clear "you don't have access" explanation rather than hiding the
  // feature - see PublishGlobeData.jsx. Publishers get the consolidated
  // /publisher dashboard instead, which links to it from there, so the
  // flat nav link is redundant once you're actually a publisher.
  let links = NAV_LINKS;
  if (isAuthenticated) links = [...links, { to: '/settings', label: 'Settings' }];
  if (isPublisher) {
    links = [...links, { to: '/publisher', label: 'Publisher' }];
  } else {
    links = [...links, { to: '/publish-globe-data', label: 'Update Globe Data' }];
  }

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-brand">
          <span className="mark"></span>
          <span className="navbar-title display">ITTI</span>
        </div>

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