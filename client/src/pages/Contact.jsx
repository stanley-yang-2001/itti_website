import React from 'react';
import Reveal from '../components/Reveal.jsx';
import '../styles/Contact.css';

const CONTACTS = [
  {
    label: 'Contact',
    email: 'contact@itti.org',
    description:
      "General inquiries. Start here if you're not sure who to reach, or your question doesn't fit any category below."
  },
  {
    label: 'Fellowship',
    email: 'fellowship@itti.org',
    description:
      'For prospective and current fellows \u2014 program questions, applications, and anything related to joining or participating in the fellowship.'
  },
  {
    label: 'Chancellor',
    email: 'chancellor@itti.org',
    description:
      "Correspondence for ITTI's leadership \u2014 partnership proposals, institutional inquiries, and matters that need the office of the Chancellor directly."
  },
  {
    label: 'Press',
    email: 'press@itti.org',
    description:
      "Media inquiries \u2014 interview requests, press kits, and questions from journalists or outlets covering ITTI's work."
  },
  {
    label: 'Support',
    email: 'support@itti.org',
    description:
      'Technical help \u2014 issues with the website or your account, bug reports, and general troubleshooting.'
  }
];

export default function Contact() {
  return (
    <div className="contact-page">
      <Reveal delay={0}>
        <div className="contact-intro">
          <p className="contact-eyebrow mono">CONTACT</p>
          <h1 className="contact-heading display">Get in touch</h1>
          <p className="contact-subheading">
            Reach out to the right team directly — each address below goes to a different part of
            ITTI.
          </p>
        </div>
      </Reveal>

      <div className="contact-grid">
        {CONTACTS.map((c, i) => (
          <Reveal key={c.email} delay={80 + i * 80}>
            <div className="contact-card">
              <h2 className="contact-card-label display">{c.label}</h2>
              <a className="contact-card-email mono" href={`mailto:${c.email}`}>
                {c.email}
              </a>
              <p className="contact-card-desc">{c.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}