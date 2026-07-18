import React, { useEffect, useRef, useState } from 'react';

export default function SearchBar({ features, onSelectFeature }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setMatches([]);
      setOpen(false);
      return;
    }
    const next = features
      .filter((f) => f.properties.name.toLowerCase().includes(q))
      .slice(0, 8);
    setMatches(next);
    setOpen(next.length > 0);
  }, [query, features]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  function handlePick(feature) {
    onSelectFeature(feature);
    setOpen(false);
    setQuery(feature.properties.name);
  }

  return (
    <div className="searchwrap" ref={wrapRef}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        id="search"
        type="text"
        placeholder="Search a country…"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div id="suggestions" style={{ display: open ? 'block' : 'none' }}>
        {matches.map((f) => (
          <div key={f.id ?? f.properties.name} onClick={() => handlePick(f)}>
            {f.properties.name}
          </div>
        ))}
      </div>
    </div>
  );
}
