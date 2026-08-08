import React from 'react';
import Reveal from '../components/Reveal.jsx';
import PrivacyPolicyContent, { PRIVACY_POLICY_EFFECTIVE_DATE } from '../components/PrivacyPolicyContent.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/About.css';

export default function PrivacyPolicy() {
  return (
    <div className="about-page">
      <SEO
        path="/privacy"
        title="Privacy Policy"
        description="How the International Truth & Trauma Institute collects, uses, and protects your information, and your rights over your data."
      />
      <Reveal delay={0}>
        <section className="about-hero">
          <img src="/itti-logo.png" alt="ITTI seal" className="about-hero-seal" />
          <p className="about-hero-eyebrow mono">International Truth &amp; Trauma Institute</p>
          <h1 className="about-hero-title display">Privacy Policy</h1>
          <p className="about-hero-tagline">Effective {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
        </section>
      </Reveal>

      <div className="about-content" style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 32px 60px' }}>
        <Reveal delay={0.05}>
          <section className="about-section">
            <PrivacyPolicyContent />
          </section>
        </Reveal>
      </div>
    </div>
  );
}