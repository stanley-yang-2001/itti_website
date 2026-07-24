import React from 'react';
import { Link } from 'react-router-dom';

const YEAR = new Date().getFullYear();

const FOOTER_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/observatory', label: 'Observatory' },
  { to: '/docs', label: 'Docs' },
  { to: '/reports', label: 'Reports' },
  { to: '/country-profiles', label: 'Country Profiles' },
  { to: '/fellows', label: 'Fellows' },
  { to: '/certifications', label: 'Certifications' },
  { to: '/contact', label: 'Contact' }
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
        </nav>
      </div>

      <div className="site-footer-bottom">
        <p className="site-footer-copyright">&copy; {YEAR} ITTI. All rights reserved.</p>
        <p className="site-footer-parent">
          A division of{' '}
          <a href="https://ofhusa.org/#itti" target="_blank" rel="noopener noreferrer">
            Outlets for Hope, Inc.
          </a>
        </p>
      </div>
    </footer>
  );
}