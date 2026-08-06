import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import '../styles/About.css';

const OFH_URL = 'https://ofhusa.org';

// This site's html/body sizing makes <body> the actual scrolling container
// rather than the window, so anything that scrolls the page programmatically
// needs to target that element instead of window.
function getScroller() {
  const candidate = document.scrollingElement;
  if (candidate && candidate.scrollHeight > candidate.clientHeight) return candidate;
  return document.body;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'parent-org', label: 'Outlets for Hope' },
  { id: 'mission', label: 'Our Mission' },
  { id: 'observatories', label: 'Trauma Observatories' },
  { id: 'frameworks', label: 'Analytic Frameworks' },
  { id: 'advisory', label: 'Advisory & Consulting' },
  { id: 'who-we-serve', label: 'Who We Serve' },
  { id: 'ethics', label: 'Ethical Foundations' },
  { id: 'why', label: 'Why ITTI Matters' },
  { id: 'partnership', label: 'Partnership & Funding' },
  { id: 'contact', label: 'Contact' }
];

const MISSION_ITEMS = [
  'Develop standardized systems for documenting collective trauma exposure.',
  'Establish National and Regional Trauma Observatories.',
  'Design trauma-informed governance frameworks.',
  'Provide advisory services for truth, trauma, and reconciliation mechanisms.',
  'Bridge psychiatry, public health, transitional justice, and institutional reform research.',
  'Promote ethical, nonpartisan, and scientifically rigorous trauma documentation.'
];

const OBSERVATORY_OUTPUTS = [
  'Document trauma exposure using standardized classification systems.',
  'Produce annual Trauma Burden Reports.',
  'Map regional trauma clusters.',
  'Develop trauma-informed public policy insights.',
  'Support institutional resilience planning.'
];

const OBSERVATORY_CONTEXTS = [
  'Armed conflict',
  'Political instability',
  'Terrorism and insurgency',
  'Communal violence',
  'Chronic insecurity',
  'Environmental destruction',
  'Post-conflict reconstruction challenges'
];

const FRAMEWORKS = [
  {
    code: 'GTBI',
    name: 'Global Trauma Burden Index',
    summary:
      'A proposed population-level metric estimating cumulative trauma exposure across countries and regions.',
    details: [
      'Complements systems like the Global Burden of Disease and existing conflict datasets, which measure mortality, disability, and violent events — but not collective trauma exposure itself.',
      'Integrates multi-domain trauma event classification, person-level exposure typology, structural and environmental trauma indicators, and regional trauma density estimation.',
      'Focuses on trauma exposure burden rather than diagnosis prevalence or fatality counts.'
    ]
  },
  {
    code: 'ETTI',
    name: 'Election Trauma Temperature Index',
    summary: 'A trauma-informed electoral risk monitoring framework.',
    details: [
      'In fragile democracies, elections often activate latent trauma loads. ETTI tracks psychosocial stress indicators, violence spikes during electoral cycles, displacement signals, community-level perceived threat markers, and early-warning instability patterns.',
      'Unlike traditional election monitoring tools that focus solely on procedural integrity, ETTI incorporates trauma epidemiology and public health modeling.',
      'Designed to support violence-prevention and resilience strategies.'
    ]
  },
  {
    code: 'ITCS',
    name: 'International Trauma Classification System',
    summary: 'A proposed modular framework for categorizing trauma events and exposure.',
    details: [
      'Separates Event Classification (ITCS-E), Exposure Typology (ITCS-X), and optional Psychosocial Impact Indicators (ITCS-I).',
      'Existing psychiatric systems (DSM, ICD) classify diagnoses; existing conflict datasets (ACLED, UCDP) classify events. ITCS bridges these domains by integrating event taxonomy with person-level exposure typology, while maintaining analytic separation from diagnosis.',
      'Versioned, open to peer review, and designed for cross-national scalability.'
    ]
  }
];

const NTTC_SERVICES = [
  'Designing NTTC frameworks tailored to national contexts.',
  'Drafting enabling legislation outlines.',
  'Developing trauma documentation protocols.',
  'Designing trauma registry systems.',
  'Creating classification and coding manuals.',
  'Structuring ethical oversight models.',
  'Developing implementation roadmaps.',
  'Training registry coders and research teams.',
  'Designing trauma-informed policy frameworks.'
];

const COLLABORATIVE_PARTNERS = [
  'Multilateral agencies',
  'International NGOs',
  'Development institutions',
  'Post-conflict reconstruction programs',
  'Transitional justice initiatives'
];

const COLLABORATIVE_SUPPORT = [
  'Providing methodological frameworks.',
  'Developing trauma burden measurement systems.',
  'Advising on registry architecture.',
  'Conducting analytic modeling.',
  'Supporting capacity-building initiatives.'
];

const CONSUMER_GROUPS = [
  {
    title: 'Governments & Ministries',
    items: ['Ministries of Health', 'Ministries of Justice', 'Ministries of Interior', 'Post-conflict reconstruction authorities', 'Electoral commissions']
  },
  {
    title: "Diplomatic Missions & Consular Bodies",
    items: [
      'Embassies and high commissions in fragile or conflict-affected states',
      'Consular offices supporting displaced or at-risk nationals abroad',
      "Foreign ministries' political and human rights sections",
      'Bilateral development and stabilization attach\u00e9s',
      'Permanent missions to the United Nations and regional bodies'
    ]
  },
  {
    title: 'Multilateral Institutions',
    items: ['United Nations agencies', 'Regional bodies (e.g., African Union, ECOWAS)', 'Development banks', 'Democracy support institutions']
  },
  {
    title: 'Philanthropic Foundations',
    items: ['Global health funders', 'Democracy and governance funders', 'Human rights foundations', 'Peacebuilding philanthropies']
  },
  {
    title: 'Academic Institutions',
    items: ['Public health research centers', 'Conflict and governance research institutes', 'Psychiatry and trauma research programs', 'Global policy schools']
  },
  {
    title: 'Civil Society & Transitional Justice Bodies',
    items: ['Truth commissions', 'Reconciliation initiatives', 'Victim advocacy organizations', 'Peacebuilding networks']
  }
];

const ETHICS = [
  'Voluntary participation.',
  'Tiered confidentiality.',
  'Data encryption and security.',
  'Non-prosecutorial institutional mandate.',
  'Cultural and contextual sensitivity.',
  'Nonpartisan engagement.'
];

const WHY_STATEMENTS = [
  { k: 'Unmeasured trauma', v: 'weakens governance.' },
  { k: 'Unacknowledged trauma', v: 'erodes public trust.' },
  { k: 'Unresolved trauma', v: 'increases the likelihood of recurrence.' }
];

const WHY_PROVIDES = ['Measurement infrastructure.', 'Classification discipline.', 'Analytic clarity.', 'Governance-informed insights.'];

const PARTNERSHIP_GOALS = [
  'Establish International Trauma Observatories.',
  'Advance the Global Trauma Burden Index.',
  'Pilot the Election Trauma Temperature Index.',
  'Refine and validate the International Trauma Classification System.',
  'Support NTTC design and advisory engagements.'
];

export default function About() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [openFramework, setOpenFramework] = useState('GTBI');
  const [openGroup, setOpenGroup] = useState(CONSUMER_GROUPS[0].title);
  const sectionRefs = useRef({});

  useEffect(() => {
    const scroller = getScroller();

    // Which section is "active": the last one whose top has scrolled up
    // past a fixed reference line near the top of the viewport - the
    // standard scrollspy algorithm (same idea Bootstrap/most doc sites
    // use). This is purely positional, so it can't miss a section
    // regardless of how short it is.
    //
    // The previous approach used an IntersectionObserver watching for
    // entries becoming visible in a band partway down the viewport. That
    // works for tall sections, but a short one (like "A Division of
    // Outlets for Hope, Inc." - much shorter than its neighbors) could
    // enter AND exit that band within a single scroll before the browser
    // ever delivered a callback reporting it as intersecting, so its
    // sidebar link would never light up. Comparing section positions
    // directly on every scroll tick doesn't have that gap.
    function computeActiveSection() {
      const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
      const referenceLine = navbarHeight + 40;

      // The reference line lives in the upper part of the viewport, so a
      // short final section can never scroll up to meet it once the page
      // is already at the bottom. Treat "scrolled to the bottom" as its
      // own case so the last section still gets marked active.
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        setActiveSection(SECTIONS[SECTIONS.length - 1].id);
        return;
      }

      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = sectionRefs.current[s.id];
        if (!el) continue;
        if (el.getBoundingClientRect().top - referenceLine <= 0) {
          current = s.id;
        } else {
          break;
        }
      }
      setActiveSection(current);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeActiveSection();
        ticking = false;
      });
    }

    computeActiveSection();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  function registerSection(id) {
    return (el) => {
      sectionRefs.current[id] = el;
    };
  }

  function scrollToSection(id) {
    const el = sectionRefs.current[id];
    if (!el) return;
    // Highlight immediately on click rather than waiting for the scroll
    // listener to catch up mid-animation - the smooth-scroll below takes
    // a few hundred ms, and the user clicked this link specifically to
    // go here, so there's no reason to wait for position math to agree.
    setActiveSection(id);
    const scroller = getScroller();
    const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
    const top = el.getBoundingClientRect().top + scroller.scrollTop - navbarHeight - 16;
    scroller.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <div className="about-page">
      <Reveal delay={0}>
        <section className="about-hero">
          <img src="/itti-logo.png" alt="ITTI seal" className="about-hero-seal" />
          <p className="about-hero-eyebrow mono">International Truth &amp; Trauma Institute</p>
          <h1 className="about-hero-title display">About ITTI</h1>
          <p className="about-hero-tagline">Documenting Trauma. Designing Resilience. Strengthening Institutions.</p>
        </section>
      </Reveal>

      <div className="about-layout">
        <nav className="about-index" aria-label="About page sections">
          <p className="about-index-label mono">On this page</p>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  className={`about-index-item${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="about-content">
          <Reveal delay={0}>
          <section id="overview" ref={registerSection('overview')} className="about-section">
            <h2 className="about-section-title display">Who We Are</h2>
            <p>
              The International Truth &amp; Trauma Institute (ITTI) is a global research, policy, and advisory
              platform dedicated to the systematic documentation, classification, and governance-informed
              analysis of collective trauma exposure in fragile, conflict-affected, and post-authoritarian
              societies.
            </p>
            <p>
              Across continents, nations continue to endure war, insurgency, political violence, terrorism,
              criminal insecurity, structural injustice, environmental devastation, displacement, and disaster.
              While physical destruction may be recorded, the psychological, intergenerational, and
              institutional consequences of trauma are rarely measured with structured rigor.
            </p>
            <div className="about-callout">
              {WHY_STATEMENTS.map((w) => (
                <p key={w.k}>
                  <strong>{w.k}</strong> {w.v}
                </p>
              ))}
            </div>
            <p>
              ITTI builds the scientific and institutional infrastructure necessary to measure trauma
              responsibly and translate those insights into policy, prevention, and resilience strategies.
            </p>
            <p className="about-note">
              ITTI is not a tribunal. ITTI is not a partisan political entity. ITTI is a research and advisory
              institution.
            </p>
          </section>
          </Reveal>

          <Reveal delay={70}>
          <section id="parent-org" ref={registerSection('parent-org')} className="about-section about-section-highlight">
            <h2 className="about-section-title display">A Division of Outlets for Hope, Inc.</h2>
            <p>
              ITTI operates as a global research division of <strong>Outlets for Hope, Inc.</strong>, a
              U.S.-based human development organization with over eight years of operational experience.
              Outlets for Hope provides the institutional home from which ITTI's research, advisory, and
              observatory programs are run.
            </p>
            <a href={OFH_URL} target="_blank" rel="noopener noreferrer" className="about-link-btn">
              Visit Outlets for Hope, Inc.
              <span aria-hidden="true">↗</span>
            </a>
            <p className="about-note">ofhusa.org</p>
          </section>
          </Reveal>

          <Reveal delay={140}>
          <section id="mission" ref={registerSection('mission')} className="about-section">
            <h2 className="about-section-title display">Our Mission</h2>
            <ol className="about-numbered-list">
              {MISSION_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
          </Reveal>

          <Reveal delay={210}>
          <section id="observatories" ref={registerSection('observatories')} className="about-section">
            <h2 className="about-section-title display">International Trauma Observatories (ITOs)</h2>
            <p>ITTI establishes country-level Trauma Observatories designed to:</p>
            <ul className="about-bullet-list">
              {OBSERVATORY_OUTPUTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Each Observatory operates under strict ethical safeguards, including encrypted data systems,
              voluntary participation, tiered confidentiality, and separation of personally identifiable
              information from analytic datasets.
            </p>
            <p className="about-note">Observatories are particularly relevant in countries experiencing:</p>
            <div className="about-chip-row">
              {OBSERVATORY_CONTEXTS.map((item) => (
                <span key={item} className="about-chip">
                  {item}
                </span>
              ))}
            </div>
          </section>
          </Reveal>

          <Reveal delay={280}>
          <section id="frameworks" ref={registerSection('frameworks')} className="about-section">
            <h2 className="about-section-title display">Three Major Analytic Frameworks</h2>
            <p>ITTI has developed three integrated research frameworks that form the intellectual foundation of its work.</p>
            <div className="about-accordion">
              {FRAMEWORKS.map((fw) => {
                const isOpen = openFramework === fw.code;
                return (
                  <div key={fw.code} className={`about-accordion-item${isOpen ? ' open' : ''}`}>
                    <button
                      className="about-accordion-header"
                      onClick={() => setOpenFramework(isOpen ? null : fw.code)}
                      aria-expanded={isOpen}
                    >
                      <span className="about-accordion-code mono">{fw.code}</span>
                      <span className="about-accordion-name">{fw.name}</span>
                      <span className="about-accordion-caret" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="about-accordion-body">
                        <p className="about-accordion-summary">{fw.summary}</p>
                        <ul className="about-bullet-list">
                          {fw.details.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          </Reveal>

          <Reveal delay={350}>
          <section id="advisory" ref={registerSection('advisory')} className="about-section">
            <h2 className="about-section-title display">NTTC Design &amp; Implementation Consulting</h2>
            <p>
              A core advisory service of ITTI is the design and implementation consulting of National Truth
              &amp; Trauma Commission (NTTC) frameworks and related institutional mechanisms, supporting nations
              emerging from conflict, authoritarian rule, or prolonged instability. ITTI provides technical
              assistance in:
            </p>
            <ul className="about-bullet-list about-bullet-list-grid">
              {NTTC_SERVICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3 className="about-subsection-title display">Collaborative Support to International Organizations</h3>
            <p>ITTI also provides advisory and collaborative support to:</p>
            <div className="about-chip-row">
              {COLLABORATIVE_PARTNERS.map((item) => (
                <span key={item} className="about-chip">
                  {item}
                </span>
              ))}
            </div>
            <p className="about-note">ITTI can support NTTC-like projects or trauma documentation programs by:</p>
            <ul className="about-bullet-list">
              {COLLABORATIVE_SUPPORT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          </Reveal>

          <Reveal delay={420}>
          <section id="who-we-serve" ref={registerSection('who-we-serve')} className="about-section">
            <h2 className="about-section-title display">Who We Serve</h2>
            <p>ITTI's services are particularly relevant to:</p>
            <p className="about-note">
              This includes diplomatic missions and consular bodies operating in or supporting fragile, conflict-affected,
              or post-authoritarian states &mdash; where trauma-informed briefings, registry design, and early-warning
              indicators like ETTI can directly inform bilateral engagement and duty-of-care planning for nationals abroad.
            </p>
            <div className="about-accordion">
              {CONSUMER_GROUPS.map((group) => {
                const isOpen = openGroup === group.title;
                return (
                  <div key={group.title} className={`about-accordion-item${isOpen ? ' open' : ''}`}>
                    <button
                      className="about-accordion-header"
                      onClick={() => setOpenGroup(isOpen ? null : group.title)}
                      aria-expanded={isOpen}
                    >
                      <span className="about-accordion-name">{group.title}</span>
                      <span className="about-accordion-caret" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="about-accordion-body">
                        <ul className="about-bullet-list">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          </Reveal>

          <Reveal delay={490}>
          <section id="ethics" ref={registerSection('ethics')} className="about-section">
            <h2 className="about-section-title display">Ethical Foundations</h2>
            <p>ITTI is grounded in:</p>
            <div className="about-chip-row">
              {ETHICS.map((item) => (
                <span key={item} className="about-chip">
                  {item}
                </span>
              ))}
            </div>
            <p className="about-note">ITTI's purpose is structural resilience, not political retaliation.</p>
          </section>
          </Reveal>

          <Reveal delay={560}>
          <section id="why" ref={registerSection('why')} className="about-section">
            <h2 className="about-section-title display">Why ITTI Matters</h2>
            <p>Fragile institutions cannot reform what they do not measure. Without structured trauma documentation:</p>
            <ul className="about-bullet-list">
              <li>Policy responses remain reactive.</li>
              <li>Trauma narratives become politicized.</li>
              <li>Intergenerational instability deepens.</li>
            </ul>
            <p>ITTI provides:</p>
            <div className="about-chip-row">
              {WHY_PROVIDES.map((item) => (
                <span key={item} className="about-chip">
                  {item}
                </span>
              ))}
            </div>
          </section>
          </Reveal>

          <Reveal delay={630}>
          <section id="partnership" ref={registerSection('partnership')} className="about-section about-section-highlight">
            <h2 className="about-section-title display">Partnership &amp; Funding Invitation</h2>
            <p>ITTI seeks strategic partnerships and funding support to:</p>
            <ul className="about-bullet-list">
              {PARTNERSHIP_GOALS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              We welcome collaboration with governments, foundations, multilateral agencies, and academic
              institutions committed to durable resilience and trauma-informed governance.
            </p>
            <Link to="/contact" className="about-link-btn">
              Get in touch
              <span aria-hidden="true">→</span>
            </Link>
          </section>
          </Reveal>

          <Reveal delay={700}>
          <section id="contact" ref={registerSection('contact')} className="about-section">
            <h2 className="about-section-title display">Contact</h2>
            <p className="about-contact-org">International Truth &amp; Trauma Institute (ITTI)</p>
            <p className="about-note">A Division of Outlets for Hope, Inc.</p>
            <div className="about-contact-row">
              <a href="mailto:itti@ofhusa.org" className="about-link-btn secondary">
                itti@ofhusa.org
              </a>
              <a href={OFH_URL} target="_blank" rel="noopener noreferrer" className="about-link-btn secondary">
                ofhusa.org
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <blockquote className="about-closing">
              <p>Truth documented responsibly strengthens institutions.</p>
              <p>Trauma measured ethically informs reform.</p>
              <p>Resilience built on evidence endures.</p>
            </blockquote>
            <p>
              The International Truth &amp; Trauma Institute exists to ensure that trauma is not merely
              remembered — but understood, measured, and prevented from repeating.
            </p>
          </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}