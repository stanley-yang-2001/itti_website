import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as topojson from 'topojson-client';
import Globe from '../components/Globe.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SidePanel from '../components/SidePanel.jsx';
import { fetchWorldData, fetchCountry, fetchAllCountries } from '../api.js';
import { computeCountryDataStatus } from '../utils/countryDataStatus.js';

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
  const [worldData, setWorldData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [country, setCountry] = useState(null); // { name, iso }
  const [metrics, setMetrics] = useState(null);
  const [countryStatus, setCountryStatus] = useState({}); // iso -> 'etti' | 'gtbi' | 'both'
  const globeRef = useRef(null);

  useEffect(() => {
    fetchWorldData().then((world) => {
      setWorldData(world);
      const parsed = topojson.feature(world, world.objects.countries);
      setFeatures(parsed.features);
    });
    fetchAllCountries()
      .then((countries) => setCountryStatus(computeCountryDataStatus(countries)))
      .catch(() => setCountryStatus({})); // globe still renders fine with default colors
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
      <main>
        {/* Part 1: welcome */}
        <section className="home-welcome">
          <p className="home-welcome-eyebrow">WELCOME</p>
          <h1 className="home-welcome-title display">
            Welcome to the International Truth &amp; Trauma Institute
          </h1>
          <p className="home-welcome-message">{MISSION_MESSAGE}</p>
        </section>

        {/* Part 2: globe (left) + message and country panel (right) */}
        <section className="home-globe">
          <div className="home-globe-grid">
            <div className="home-globe-left">
              <SearchBar features={features} onSelectFeature={handleSelectFeature} />
              {worldData && (
                <Globe
                  ref={globeRef}
                  worldData={worldData}
                  onCountryClick={handleCountryClick}
                  countryStatus={countryStatus}
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
      </main>

      <section className="home-explore">
        <div className="home-explore-intro">
          <p className="home-explore-eyebrow mono">EXPLORE</p>
          <h2 className="home-explore-heading display">Where to go from here</h2>
        </div>

        <div className="home-explore-grid">
          {EXPLORE_CARDS.map((card) => (
            <Link key={card.to} to={card.to} className="home-explore-card">
              <span className="home-explore-card-label display">{card.label}</span>
              <p className="home-explore-card-desc">{card.description}</p>
              <span className="home-explore-card-arrow" aria-hidden="true">&rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}