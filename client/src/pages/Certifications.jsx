import React, { useMemo, useState } from 'react';
import { CATEGORIES, CERTIFICATIONS, COMPARISON_ROWS } from '../data/certifications.js';
import Reveal from '../components/Reveal.jsx';
import CertificationEnrollModal from './CertificationEnroll.jsx';
import useHashScroll from '../hooks/useHashScroll.js';
import '../styles/Certifications.css';

const BADGE_CLASS = {
  'MOST POPULAR': 'popular',
  'ITTI PROPRIETARY METHODOLOGY': 'proprietary',
  SELECTIVE: 'selective'
};

function tuitionValue(str) {
  return Number(str.replace(/[^0-9.]/g, ''));
}

export default function Certifications() {
  useHashScroll();
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortByPrice, setSortByPrice] = useState(false);
  const [enrollingCert, setEnrollingCert] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CERTIFICATIONS.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.focus.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, query]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: filtered.filter((c) => c.category === cat.id)
    })).filter((cat) => cat.items.length > 0);
  }, [filtered]);

  const comparisonRows = useMemo(() => {
    const rows = [...COMPARISON_ROWS];
    if (sortByPrice) rows.sort((a, b) => tuitionValue(a.tuition) - tuitionValue(b.tuition));
    else rows.sort((a, b) => a.rank - b.rank);
    return rows;
  }, [sortByPrice]);

  function toggleExpanded(code) {
    setExpanded((prev) => (prev === code ? null : code));
  }

  function jumpToCert(code) {
    setExpanded(code);
    requestAnimationFrame(() => {
      const el = document.getElementById(`cert-${code}`);
      if (!el) return;
      const scroller = document.scrollingElement && document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight
        ? document.scrollingElement
        : document.body;
      const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
      const top = el.getBoundingClientRect().top + scroller.scrollTop - navbarHeight - 16;
      scroller.scrollTo({ top, behavior: 'smooth' });
    });
  }

  return (
    <div className="certs-page">
      <Reveal delay={0}>
        <section className="certs-hero" id="overview">
          <p className="certs-hero-eyebrow mono">ITTI Professional Certifications</p>
          <h1 className="certs-hero-title display">Understand Trauma. Transform Systems. Help the World Heal.</h1>
          <p className="certs-hero-sub">
            Earn a globally focused ITTI professional designation in just four weeks — and gain the applied
            expertise to strengthen care, build healthier workplaces, transform institutions, advance peace,
            analyze elections, measure global trauma, and support healing across communities and nations.
          </p>
          <p className="certs-hero-sub2">
            Every four-week program combines focused instruction, guided application, practical analytical
            tools, professional assessment, and a real-world final project. Successful participants earn an
            ITTI designation, digital credential, certificate-verification access, and a pathway into the
            Institute's growing international professional and Observatory community.
          </p>
          <div className="certs-hero-actions">
            <a href="#cert-grid" className="certs-btn primary">Explore ITTI Credentials</a>
            <a href="#compare" className="certs-btn secondary">Find Your Certification Pathway</a>
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section id="cert-grid" className="certs-toolbar">
          <div className="certs-filter-pills">
            <button
              className={`certs-pill${activeCategory === 'all' ? ' active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All ({CERTIFICATIONS.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`certs-pill${activeCategory === cat.id ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label} ({CERTIFICATIONS.filter((c) => c.category === cat.id).length})
              </button>
            ))}
          </div>
          <input
            type="text"
            className="certs-search"
            placeholder="Search by name, code, or focus…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>
      </Reveal>

      <div className="certs-groups">
        {grouped.length === 0 && (
          <p className="certs-empty">No certifications match your search.</p>
        )}
        {grouped.map((cat, i) => (
          <Reveal key={cat.id} delay={i * 90}>
            <section className="certs-group">
              <h2 className="certs-group-title display">{cat.label}</h2>
              <div className="certs-grid">
              {cat.items.map((c) => {
                const isOpen = expanded === c.code;
                return (
                  <article
                    key={c.code}
                    id={`cert-${c.code}`}
                    className={`cert-card${isOpen ? ' open' : ''}`}
                  >
                    <button className="cert-card-summary" onClick={() => toggleExpanded(c.code)} aria-expanded={isOpen}>
                      <div className="cert-card-heading">
                        <span className="cert-card-code mono">{c.code}™</span>
                        {c.badge && (
                          <span className={`cert-card-badge ${BADGE_CLASS[c.badge] || ''}`}>{c.badge}</span>
                        )}
                      </div>
                      <h3 className="cert-card-name">{c.name}</h3>
                      <p className="cert-card-tagline">{c.tagline}</p>
                      <div className="cert-card-meta">
                        <span>{c.duration}</span>
                        <span className="cert-card-dot">•</span>
                        <span>{c.tuition} USD</span>
                      </div>
                      <span className="cert-card-toggle mono">{isOpen ? 'Collapse −' : 'View details +'}</span>
                    </button>

                    {isOpen && (
                      <div className="cert-card-details">
                        <img src={c.image} alt={`${c.code} certification banner`} className="cert-detail-image" loading="lazy" />

                        {c.pathway && (
                          <p className="cert-pathway-note">
                            {c.pathway.label}
                            {c.pathway.next && (
                              <> — leads to <button className="cert-inline-link" onClick={() => jumpToCert(c.pathway.next)}>{c.pathway.next}™</button></>
                            )}
                            {c.pathway.prereq && (
                              <> — requires <button className="cert-inline-link" onClick={() => jumpToCert(c.pathway.prereq)}>{c.pathway.prereq}™</button> first</>
                            )}
                          </p>
                        )}

                        <div className="cert-detail-grid">
                          <div className="cert-detail-main">
                            <h4 className="cert-detail-heading display">Program Overview</h4>
                            {c.overview.map((p, i) => (
                              <p key={i} className="cert-detail-p">{p}</p>
                            ))}

                            {c.admissionNote && (
                              <div className="cert-callout">
                                <p><strong>Admission Requirement:</strong> {c.admissionNote}</p>
                              </div>
                            )}

                            <h4 className="cert-detail-heading display">Four-Week Curriculum</h4>
                            <div className="cert-weeks">
                              {c.curriculum.map((wk) => (
                                <div key={wk.week} className="cert-week">
                                  <p className="cert-week-title mono">Week {wk.week}</p>
                                  <p className="cert-week-name">{wk.title}</p>
                                  <ul>
                                    {wk.bullets.map((b, i) => <li key={i}>{b}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            <h4 className="cert-detail-heading display">What You'll Be Prepared to Do</h4>
                            <ul className="cert-detail-list two-col">
                              {c.outcomes.map((o, i) => <li key={i}>{o}</li>)}
                            </ul>
                          </div>

                          <div className="cert-detail-side">
                            <div className="cert-side-block">
                              <p className="cert-side-label mono">Program Details</p>
                              <dl className="cert-side-dl">
                                <dt>Duration</dt><dd>{c.duration}</dd>
                                <dt>Delivery</dt><dd>{c.delivery}</dd>
                                <dt>Time Commitment</dt><dd>{c.timeCommitment}</dd>
                                <dt>Tuition</dt><dd>{c.tuition} USD</dd>
                                <dt>Credential</dt><dd>{c.credential}</dd>
                                <dt>Final Requirement</dt><dd>{c.finalRequirement}</dd>
                              </dl>
                            </div>

                            <div className="cert-side-block">
                              <p className="cert-side-label mono">{c.whoLabel}</p>
                              <div className="cert-chip-row">
                                {c.who.map((w) => <span key={w} className="cert-chip">{w}</span>)}
                              </div>
                              {c.whoNote && <p className="cert-side-note">{c.whoNote}</p>}
                            </div>

                            <div className="cert-side-block">
                              <p className="cert-side-label mono">Certification Requirements</p>
                              <ul className="cert-detail-list">
                                {c.requirements.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>

                            <div className="cert-side-block">
                              <p className="cert-side-label mono">Your Credential Package</p>
                              <ul className="cert-detail-list">
                                {c.credentialPackage.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEnrollingCert(c)}
                              className="certs-btn primary full"
                            >
                              {c.ctaVerb} in {c.code}™ — {c.tuition}
                            </button>
                            <p className="cert-refund-note">
                              Refund policy: 50% refundable within 7 days of purchase; no refunds after 7 days.
                            </p>
                          </div>
                        </div>

                        <p className="cert-notice">{c.notice}</p>
                      </div>
                    )}
                  </article>
                );
              })}
              </div>
            </section>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0}>
        <section id="compare" className="certs-compare">
          <h2 className="certs-group-title display">Compare at a Glance</h2>
          <p className="certs-compare-sub">All eleven credentials share the same four-week structure. Tuition and depth scale with specialization.</p>
          <div className="certs-compare-table-wrap">
            <table className="certs-compare-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Certification</th>
                  <th>Primary Focus</th>
                  <th>Duration</th>
                  <th>
                    <button className="cert-sort-btn mono" onClick={() => setSortByPrice((v) => !v)}>
                      Tuition {sortByPrice ? '↑' : ''}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.code} onClick={() => jumpToCert(row.code)} className="certs-compare-row">
                    <td>{row.rank}</td>
                    <td className="mono">{row.code}™</td>
                    <td>{row.focus}</td>
                    <td>{row.duration}</td>
                    <td>{row.tuition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Reveal>

      {enrollingCert && (
        <CertificationEnrollModal cert={enrollingCert} onClose={() => setEnrollingCert(null)} />
      )}
    </div>
  );
}