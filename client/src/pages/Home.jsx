import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as topojson from 'topojson-client';
import Globe from '../components/Globe.jsx';
import Reveal from '../components/Reveal.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SidePanel from '../components/SidePanel.jsx';
import useHashScroll from '../hooks/useHashScroll.js';
import SEO from '../components/SEO.jsx';
import { fetchWorldData, fetchCountry, fetchAllCountries } from '../api.js';
import { computeCountryDataStatus, computeCountryQuickStats } from '../utils/countryDataStatus.js';

const EXPLORE_CARDS = [
  {
    to: '/observatory',
    label: 'Observatory',
    description: 'Our data mission, the indicators we track, and the dashboards behind them.'
  },
  {
    to: '/reports',
    label: 'Reports',
    description: 'Published briefs, PDFs, and other work coming out of the institute.'
  },
  {
    to: '/about',
    label: 'About',
    description: 'Our mission, leadership, and how the organization is governed.'
  },
  {
    to: '/fellows',
    label: 'Fellowship',
    description: 'Meet the people doing the work \u2014 and find out how to join them.'
  }
];

const MISSION_MESSAGE =
  'ITTI is a global research and advisory institute that documents collective trauma, builds ' +
  'country-level Trauma Observatories and standardized indices like GTBI and ETTI, and turns ' +
  'those insights into trauma-informed governance and policy reform.';

export default function Home() {
  useHashScroll();
  const [worldData, setWorldData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [country, setCountry] = useState(null); // { name, iso }
  const [metrics, setMetrics] = useState(null);
  const [countryStatus, setCountryStatus] = useState({}); // iso -> 'etti' | 'gtbi' | 'both'
  const [countryQuickStats, setCountryQuickStats] = useState({}); // iso -> { name, etti, gtbi } for the hover tooltip
  const globeRef = useRef(null);

  useEffect(() => {
    fetchWorldData().then((world) => {
      setWorldData(world);
      const parsed = topojson.feature(world, world.objects.countries);
      setFeatures(parsed.features);
    });
    fetchAllCountries()
      .then((countries) => {
        setCountryStatus(computeCountryDataStatus(countries));
        setCountryQuickStats(computeCountryQuickStats(countries));
      })
      .catch(() => {
        setCountryStatus({}); // globe still renders fine with default colors
        setCountryQuickStats({}); // hover tooltip just won't show ETTI/GTBI lines
      });
  }, []);

  function openCountry(name, iso) {
    setCountry({ name, iso });
    fetchCountry(iso)
      .then(setMetrics)
      .catch(() => setMetrics(null)); // fall back to placeholder zeros in the panel
  }

  function handleCountryClick(name, iso) {
    openCountry(name, iso);
  }

  function handleSelectFeature(feature) {
    globeRef.current?.focusOnFeature(feature);
  }

  function handleClose() {
    setCountry(null);
    setMetrics(null);
  }

  return (
    <>
      <SEO
        path="/"
        title="Global Trauma Research & Trauma-Informed Governance"
        description="The International Truth & Trauma Institute documents collective trauma, builds country-level Trauma Observatories and standardized indices like GTBI and ETTI, and turns those insights into trauma-informed governance and policy reform."
      />
      <main>
        {/* Part 1: welcome */}
        <Reveal delay={0}>
          <section className="home-welcome" id="welcome">
            <p className="home-welcome-eyebrow">WELCOME</p>
            <h1 className="home-welcome-title display">
              Welcome <br />to the <br />International Truth &amp; Trauma Institute
            </h1>
            <p className="home-welcome-message">{MISSION_MESSAGE}</p>
          </section>
        </Reveal>

        {/* Part 2: globe (left) + message and country panel (right) */}
        <Reveal delay={120}>
          <section className="home-globe" id="globe">
            <div className="home-globe-grid">
              <div className="home-globe-left">
                <SearchBar features={features} onSelectFeature={handleSelectFeature} />
                {worldData && (
                  <Globe
                    ref={globeRef}
                    worldData={worldData}
                    onCountryClick={handleCountryClick}
                    countryStatus={countryStatus}
                    countryQuickStats={countryQuickStats}
                  />
                )}
                <div className="globe-legend">
                  <span className="globe-legend-item">
                    <span className="globe-legend-swatch data-etti"></span>ETTI data
                  </span>
                  <span className="globe-legend-item">
                    <span className="globe-legend-swatch data-gtbi"></span>GTBI data
                  </span>
                  <span className="globe-legend-item">
                    <span className="globe-legend-swatch data-both"></span>ETTI + GTBI
                  </span>
                </div>
                <div className="hint">
                  <span className="dot"></span>DRAG TO ROTATE<span className="dot"></span>SCROLL TO ZOOM
                  <span className="dot"></span>CLICK A COUNTRY
                </div>
              </div>

              <div className="home-globe-right">
                <SidePanel country={country} record={metrics} onClose={handleClose} />
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      <section className="home-explore" id="explore">
        <Reveal delay={0}>
          <div className="home-explore-intro">
            <p className="home-explore-eyebrow mono">EXPLORE</p>
            <h2 className="home-explore-heading display">Where to go from here</h2>
          </div>
        </Reveal>

        <div className="home-explore-grid">
          {EXPLORE_CARDS.map((card, i) => (
            <Reveal key={card.to} delay={i * 90}>
              <Link to={card.to} className="home-explore-card">
                <span className="home-explore-card-label display">{card.label}</span>
                <p className="home-explore-card-desc">{card.description}</p>
                <span className="home-explore-card-arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-connect" id="connect">
        <Reveal delay={0}>
          <div className="home-connect-intro">
            <p className="home-explore-eyebrow mono">CONNECT</p>
            <h2 className="home-explore-heading display">Watch, follow, and learn more</h2>
          </div>
        </Reveal>

        <div className="home-connect-grid">
          <Reveal delay={90}>
            <a
              className="home-connect-card home-connect-card--video"
              href="https://youtube.com/shorts/XLbzQiiqUXU?si=IkReWAJ-HWrFvdzU"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="home-connect-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
                  <path d="M10.5 9.5v5l4.3-2.5-4.3-2.5Z" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="home-explore-card-label display">ITTI on YouTube</span>
              <p className="home-explore-card-desc">
                Watch a short introduction to the Institute's work on our YouTube channel.
              </p>
              <span className="home-explore-card-arrow" aria-hidden="true">&rarr;</span>
            </a>
          </Reveal>

          <Reveal delay={160}>
            <a
              className="home-connect-card"
              href="https://ofhusa.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="home-connect-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9S9.5 5.7 12 3Z" />
                </svg>
              </span>
              <span className="home-explore-card-label display">Outlets for Hope, Inc.</span>
              <p className="home-explore-card-desc">
                ITTI is a global research division of Outlets for Hope, Inc. Visit the parent organization's site.
              </p>
              <span className="home-explore-card-arrow" aria-hidden="true">&rarr;</span>
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}