import React from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import '../styles/About.css';

const EFFECTIVE_DATE = 'July 2026';

export default function PrivacyPolicy() {
  return (
    <div className="about-page">
      <Reveal delay={0}>
        <section className="about-hero">
          <img src="/itti-logo.png" alt="ITTI seal" className="about-hero-seal" />
          <p className="about-hero-eyebrow mono">International Truth &amp; Trauma Institute</p>
          <h1 className="about-hero-title display">Privacy Policy</h1>
          <p className="about-hero-tagline">Effective {EFFECTIVE_DATE}</p>
        </section>
      </Reveal>

      <div className="about-content" style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 32px 60px' }}>
        <Reveal delay={0}>
          <section className="about-section">
            <h2 className="about-section-title display">Overview</h2>
            <p>
              This policy explains what information the International Truth &amp; Trauma Institute ("ITTI,"
              "we," "us") collects when you create an account on this website, how we use it, who we share it
              with, and the choices and rights you have over it. It applies to account creation, sign-in, and
              the account-connected features on this site (Observatory saved charts, favorited reports,
              donations, and certification enrollment).
            </p>
            <p>
              This policy describes our current practices as implemented on this website. It is not a
              substitute for legal advice, and if you need this policy to satisfy a specific legal or
              regulatory requirement, please have it reviewed by counsel.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Information We Collect</h2>
            <p><strong>When you create an account</strong>, we collect:</p>
            <ul className="about-bullet-list">
              <li>Your email address (required)</li>
              <li>A securely hashed version of your password, if you sign up with email/password. We never store your password in plain text, and no one at ITTI can view it.</li>
              <li>Your name, if you provide one</li>
            </ul>

            <p><strong>If you sign in with Google instead</strong>, Google provides us with:</p>
            <ul className="about-bullet-list">
              <li>Your email address, name, and profile picture, as returned by your Google account</li>
              <li>A unique Google account identifier, used only to recognize your account on future sign-ins</li>
            </ul>
            <p>
              We do not receive your Google password, and we do not send your information back to Google
              beyond the standard sign-in request itself — see "Information Sharing" below.
            </p>

            <p><strong>As you use the site</strong>, depending on which features you use, we may also collect:</p>
            <ul className="about-bullet-list">
              <li>Your account role (e.g. standard user, publisher, administrator) and account status</li>
              <li>An internal log of account activity (e.g. document or report uploads/edits), used for accountability and troubleshooting</li>
              <li>Charts you save on the Observatory page</li>
              <li>Reports you mark as favorites</li>
              <li>If you donate: your name, email, donation amount, and a payment confirmation record. Your card details are collected and processed directly by Stripe, our payment processor — we never receive or store your full card number.</li>
              <li>If you enroll in a certification: the certification, tuition amount, and a payment confirmation record, tied to your account. As with donations, card details are handled directly by Stripe.</li>
              <li>If you're a publisher or administrator: the documents and reports you upload, and your name as the credited author/publisher where applicable (for example, on a published report's byline)</li>
            </ul>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">How We Use Your Information</h2>
            <p>We use the information above to:</p>
            <ul className="about-bullet-list">
              <li>Create and secure your account, and let you sign in</li>
              <li>Attribute content you publish (for example, showing a publisher's name on a report they authored)</li>
              <li>Send account-related emails, such as password reset links, donation receipts, and certification enrollment confirmations</li>
              <li>Process payments for donations and certification tuition, in partnership with Stripe</li>
              <li>Maintain an internal record of account activity for accountability, troubleshooting, and abuse prevention</li>
              <li>Provide features you choose to use, like saved Observatory charts and favorited reports</li>
            </ul>
            <p>
              We do not sell your personal information, and we do not use it for third-party advertising. This
              site does not currently show ads.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Information Sharing</h2>
            <p>We do not share your account information with third parties, with two specific exceptions:</p>
            <ul className="about-bullet-list">
              <li>
                <strong>Google (only if you choose to sign in with Google):</strong> information flows from
                Google to us when you use Google sign-in, so we can create and recognize your account. We do
                not send your account information to Google in return.
              </li>
              <li>
                <strong>Stripe (only if you make a donation or enroll in a certification):</strong> Stripe
                processes your payment directly and securely. We share the minimum information necessary to
                process the transaction (such as your name, email, and the amount) and receive back a
                confirmation of payment — never your full card details.
              </li>
            </ul>
            <p>We do not sell, rent, or otherwise share your information with any other third party.</p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Your Rights and Choices</h2>
            <p>You can, at any time:</p>
            <ul className="about-bullet-list">
              <li><strong>View</strong> your account information from your <Link to="/profile">Profile</Link> page</li>
              <li><strong>Update</strong> your name, email, or password from your <Link to="/settings">Settings</Link> page</li>
              <li>
                <strong>Delete your account</strong> from Settings. This deactivates your account immediately;
                if you sign back in or sign up again with the same email afterward, your account (and its
                history) is reactivated rather than recreated from scratch.
              </li>
              <li>
                <strong>Request a copy of your data, or full erasure of it,</strong> by{' '}
                <Link to="/contact">contacting us</Link>. We don't yet offer a self-service export tool, so
                this is handled manually.
              </li>
            </ul>
            <p>
              Depending on where you live, you may have additional rights under applicable law — for example,
              the right to data portability or to lodge a complaint with a data protection authority. Contact
              us to exercise any of these rights.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Data Retention &amp; Security</h2>
            <p>
              We retain account information for as long as your account is active, plus a reasonable period
              after deletion to support account recovery (see "Your Rights and Choices" above) and to meet our
              own recordkeeping and legal obligations (for example, payment and donation records). Passwords
              are stored using a one-way cryptographic hash, never in plain text. Payment card details are
              never stored on our servers — they're handled directly by Stripe, a PCI-compliant payment
              processor.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Children's Privacy</h2>
            <p>
              This site is not directed at children, and we do not knowingly collect information from
              children. If you believe a child has created an account, please contact us and we will address
              it.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Changes to This Policy</h2>
            <p>
              If we make material changes to this policy, we'll update the effective date above. Continuing to
              use your account after a change means you accept the updated policy.
            </p>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="about-section">
            <h2 className="about-section-title display">Contact Us</h2>
            <p>
              Questions about this policy, or requests regarding your data, can be sent through our{' '}
              <Link to="/contact">Contact page</Link>.
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}