import React from 'react';
import { Link } from 'react-router-dom';

const YEAR = new Date().getFullYear();

// Only routes that AREN'T already in NavBar's NAV_LINKS belong here — no
// point repeating the same links in both places. Add future footer-only
// items (legal pages, resources, social, etc.) to this list.
const FOOTER_LINKS = [
  { to: '/docs', label: 'Docs' },
  { to: '/privacy', label: 'Privacy Policy' }
];

const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/profile.php?id=61592894404554', label: 'Facebook' }
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <img src="/itti-logo.png" alt="ITTI seal" className="site-footer-logo" />
          <span className="site-footer-title display">ITTI</span>
        </div>

        <nav className="site-footer-links" aria-label="Footer">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="site-footer-link">
              {link.label}
            </Link>
          ))}
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-link"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="site-footer-bottom">
        <p className="site-footer-copyright">&copy; {YEAR} ITTI. All rights reserved.</p>
        <p className="site-footer-parent">
          A division of{' '}
          <a href="https://ofhusa.org" target="_blank" rel="noopener noreferrer">
            Outlets for Hope, Inc.
          </a>
        </p>
      </div>
    </footer>
  );
}