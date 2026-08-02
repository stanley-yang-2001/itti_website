import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// This site's html/body sizing makes <body> the actual scrolling container
// rather than the window (see the same helper in About.jsx) - so scroll
// position has to be read off that element, not window.scrollY.
function getScroller() {
  const candidate = document.scrollingElement;
  if (candidate && candidate.scrollHeight > candidate.clientHeight) return candidate;
  return document.body;
}

// Below this many pixels of scroll, the navbar is "at the top" and shows
// its full size; past it, it switches to the compact scrolled state. Not
// exactly 0 so a 1-2px scroll bounce (some trackpads/browsers) doesn't
// flicker the navbar in and out of its compact state.
const SCROLL_COMPACT_THRESHOLD = 24;

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
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, isPublisher, logout } = useAuth();
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

  // Collapses the navbar (hides the logo/name, shrinks the padding - see
  // .navbar--scrolled in App.css) once the page has scrolled away from
  // the very top, and restores it once back at the top.
  useEffect(() => {
    const scroller = getScroller();

    function onScroll() {
      setIsScrolled(scroller.scrollTop > SCROLL_COMPACT_THRESHOLD);
    }

    onScroll(); // in case a page loads already scrolled (e.g. a #hash link)
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate('/');
  }

  const links = isPublisher ? [...NAV_LINKS, { to: '/publish', label: 'Publish' }] : NAV_LINKS;

  return (
    <nav className={`navbar${isScrolled ? ' navbar--scrolled' : ''}`} ref={navRef}>
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
            className={({ isActive }) => 'navbar-donate-btn' + (isActive ? ' active' : '')}
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
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                'navbar-link' + (link.emphasize ? ' navbar-link-donate' : '') + (isActive ? ' active' : '')
              }
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