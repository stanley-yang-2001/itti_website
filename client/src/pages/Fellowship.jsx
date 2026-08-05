import React, { useState } from 'react';
import { FELLOW_LEVELS, WHO_SHOULD_APPLY, EXECUTIVE_VALUE, FELLOWS_GAIN, FELLOWS } from '../data/fellowship.js';
import Reveal from '../components/Reveal.jsx';
import '../styles/Fellowship.css';

const LEVEL_LOOKUP = Object.fromEntries(FELLOW_LEVELS.map((l) => [l.code, l]));

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function FellowCard({ fellow }) {
  const level = LEVEL_LOOKUP[fellow.level];
  return (
    <article className="fellow-card">
      <div className="fellow-card-photo">
        {fellow.photo ? (
          <img src={fellow.photo} alt={fellow.name} loading="lazy" />
        ) : (
          <span className="fellow-card-initials">{initials(fellow.name)}</span>
        )}
      </div>
      <h3 className="fellow-card-name">{fellow.name}</h3>
      {level && (
        <span className={`fellow-card-level level-${level.code.toLowerCase()}`}>{level.code}™ — {level.name}</span>
      )}
      <p className="fellow-card-bio">{fellow.bio}</p>
    </article>
  );
}

export default function Fellowship() {
  const [levelFilter, setLevelFilter] = useState('all');

  const visibleFellows = levelFilter === 'all' ? FELLOWS : FELLOWS.filter((f) => f.level === levelFilter);

  return (
    <div className="fellows-page">
      <Reveal delay={0}>
      <section className="fellows-hero">
        <p className="fellows-hero-eyebrow mono">FITTI™ Fellowship Program</p>
        <h1 className="fellows-hero-title display">Building the Global Leadership Corps for Trauma-Informed Nations</h1>
        <p className="fellows-hero-sub">
          An invitation-only global fellowship developing leaders for trauma-informed nations — building expertise
          in collective trauma, institutional healing, democratic stabilization, and national recovery.
        </p>
        <div className="fellows-hero-actions">
          <a href="#about-fellowship" className="fellows-btn secondary">About the Fellowship</a>
          <a href="#our-fellows" className="fellows-btn primary">Meet the Fellows</a>
        </div>
      </section>
      </Reveal>

      {/* ---------- Section 1: About the Fellowship ---------- */}
      <Reveal delay={90}>
      <section id="about-fellowship" className="fellows-section">
        <p className="fellows-section-eyebrow mono">About the Program</p>
        <h2 className="fellows-section-title display">Why FITTI™?</h2>
        <div className="fellows-why-grid">
          <p>An invitation-only global fellowship developing leaders for trauma-informed nations.</p>
          <p>Builds expertise in collective trauma, institutional healing, democratic stabilization, and national recovery.</p>
          <p>A prestigious international network aligned with ITTI's research and advisory mission.</p>
          <p>Designed for leaders who shape policy, systems, and institutions.</p>
        </div>

        <h3 className="fellows-subtitle display">Fellowship Pathways</h3>
        <p className="fellows-subtitle-note">Participants join a global leadership corps advancing evidence-based national healing.</p>
        <div className="fellows-pathways">
          {FELLOW_LEVELS.map((level) => (
            <div key={level.code} className={`fellows-pathway-card level-${level.code.toLowerCase()}`}>
              <div className="fellows-pathway-head">
                <span className="fellows-pathway-code mono">{level.code}™</span>
                <span className="fellows-pathway-tag">{level.tag}</span>
              </div>
              <p className="fellows-pathway-name">{level.name}</p>
              <p className="fellows-pathway-desc">{level.description}</p>
            </div>
          ))}
        </div>

        <div className="fellows-value-row">
          <div className="fellows-value-block">
            <h3 className="fellows-subtitle display">The Executive Value</h3>
            <ul className="fellows-list">
              {EXECUTIVE_VALUE.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div className="fellows-value-block">
            <h3 className="fellows-subtitle display">Fellows Gain</h3>
            <ul className="fellows-checklist">
              {FELLOWS_GAIN.map((item, i) => <li key={i}>✓ {item}</li>)}
            </ul>
          </div>
        </div>

        <h3 className="fellows-subtitle display">Who Should Become a FITTI™ Fellow?</h3>
        <div className="fellows-chip-row">
          {WHO_SHOULD_APPLY.map((item) => <span key={item} className="fellows-chip">{item}</span>)}
        </div>

        <div className="fellows-invitation">
          <h3 className="fellows-subtitle display">Invitation</h3>
          <p>We invite visionary leaders to help build the global architecture for truth, healing, and resilient societies.</p>
          <p>Become part of an international movement transforming evidence into institutional reform.</p>
          <a href="mailto:itti@ofhusa.org" className="fellows-btn primary">Inquire About a Nomination</a>
          <p className="fellows-invitation-note">
            The International Truth &amp; Trauma Institute is a program of Outlets for Hope, Inc. — founded and
            chartered under Dr. Luke Chike Igweobi, Chancellor.
          </p>
          <p>
            For more information, please contact{' '}
            <a href="mailto:fellowship@ittiglobal.org" className="fellows-contact-link">fellowship@ittiglobal.org</a>.
          </p>
        </div>
      </section>
      </Reveal>

      {/* ---------- Section 2: Our Fellows ---------- */}
      <Reveal delay={180}>
      <section id="our-fellows" className="fellows-section">
        <p className="fellows-section-eyebrow mono">The Roster</p>
        <h2 className="fellows-section-title display">Our Fellows</h2>

        {FELLOWS.length > 0 && (
          <div className="fellows-filter-pills">
            <button className={`fellows-pill${levelFilter === 'all' ? ' active' : ''}`} onClick={() => setLevelFilter('all')}>
              All ({FELLOWS.length})
            </button>
            {FELLOW_LEVELS.map((level) => (
              <button
                key={level.code}
                className={`fellows-pill${levelFilter === level.code ? ' active' : ''}`}
                onClick={() => setLevelFilter(level.code)}
              >
                {level.code}™ ({FELLOWS.filter((f) => f.level === level.code).length})
              </button>
            ))}
          </div>
        )}

        {FELLOWS.length === 0 ? (
          <div className="fellows-empty">
            <p className="fellows-empty-title">Fellows.</p>
            <p className="fellows-empty-sub">
              Fellows will be presented here with their photo, name, biography, and fellowship level as they're
              admitted into the program.
            </p>
          </div>
        ) : (
          <div className="fellows-grid">
            {visibleFellows.map((fellow) => (
              <FellowCard key={fellow.id} fellow={fellow} />
            ))}
          </div>
        )}
      </section>
      </Reveal>
    </div>
  );
}