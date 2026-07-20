import React, { useEffect, useRef, useState } from 'react';
import * as topojson from 'topojson-client';
import Header from '../components/Header.jsx';
import Globe from '../components/Globe.jsx';
import SidePanel from '../components/SidePanel.jsx';
import { fetchWorldData, fetchCountry } from '../api.js';

export default function Home() {
  // Both fetchWorldData() and fetchCountry() below run fresh every time
  // this component mounts (and fetchCountry also re-runs on every country
  // click). Navigating to /publish-globe-data and back to / is enough to
  // pick up newly uploaded GTBI/ETTI data - no caching to invalidate here.
  const [worldData, setWorldData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [country, setCountry] = useState(null); // { name, iso }
  const [record, setRecord] = useState(null); // raw /api/countries/<code> response: { name, ETTI, GTBI }
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
      .then(setRecord)
      .catch(() => setRecord(null)); // SidePanel renders "Data Pending" when record is null
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
        <SidePanel isOpen={panelOpen} country={country} record={record} onClose={handleClose} />
      </main>
    </>
  );
}