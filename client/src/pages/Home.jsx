import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as topojson from 'topojson-client';
import Header from '../components/Header.jsx';
import Globe from '../components/Globe.jsx';
import SidePanel from '../components/SidePanel.jsx';
import { fetchWorldData, fetchCountry } from '../api.js';

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
    label: 'About ITTI',
    description: 'Our mission, leadership, and how the organization is governed.'
  },
  {
    to: '/fellows',
    label: 'Fellows',
    description: 'Meet the people doing the work \u2014 and find out how to join them.'
  }
];

export default function Home() {
  const [worldData, setWorldData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [country, setCountry] = useState(null); // { name, iso }
  const [metrics, setMetrics] = useState(null);
  const globeRef = useRef(null);

  useEffect(() => {
    fetchWorldData().then((world) => {
      setWorldData(world);
      const parsed = topojson.feature(world, world.objects.countries);
      setFeatures(parsed.features);
    });
  }, []);

  function openCountry(name, iso) {
    setCountry({ name, iso });
    setPanelOpen(true);
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
    setPanelOpen(false);
  }

  return (
    <>
      <Header features={features} onSelectFeature={handleSelectFeature} />
      <main>
        {worldData && (
          <Globe ref={globeRef} worldData={worldData} onCountryClick={handleCountryClick} />
        )}
        <div className="hint">
          <span className="dot"></span>DRAG TO ROTATE<span className="dot"></span>SCROLL TO ZOOM
          <span className="dot"></span>CLICK A COUNTRY
        </div>
        <SidePanel isOpen={panelOpen} country={country} metrics={metrics} onClose={handleClose} />
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