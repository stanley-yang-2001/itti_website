import React, { useEffect, useRef, useState } from 'react';
import * as topojson from 'topojson-client';
import Header from '../components/Header.jsx';
import Globe from '../components/Globe.jsx';
import SidePanel from '../components/SidePanel.jsx';
import { fetchWorldData, fetchCountry } from '../api.js';

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
    </>
  );
}
