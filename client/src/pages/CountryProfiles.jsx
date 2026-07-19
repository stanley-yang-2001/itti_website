import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/CountryProfiles.css";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Country Profiles page. Shows an A-Z grid of letters (two rows of 13)
 * fixed at the bottom of the page. Clicking a letter filters the list
 * above it to countries whose name starts with that letter. The grid
 * stays visible at all times so the user can switch letters freely.
 */
export default function CountryProfiles() {
  const [countries, setCountries] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/countries")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load country data");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        // data is keyed by ISO numeric code -> record. Normalize to a
        // flat array and expect each record to carry a "name" field;
        // fall back to the key if a record has no name yet.
        const list = Object.entries(data).map(([code, record]) => ({
          code,
          name: record?.name || code,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countries || !selectedLetter) return [];
    return countries.filter((c) => c.name.toUpperCase().startsWith(selectedLetter));
  }, [countries, selectedLetter]);

  const availableLetters = useMemo(() => {
    if (!countries) return new Set();
    return new Set(countries.map((c) => c.name.charAt(0).toUpperCase()));
  }, [countries]);

  function handleLetterClick(letter) {
    setSelectedLetter((current) => (current === letter ? null : letter));
  }

  return (
    <div className="country-profiles-page">
      <div className="country-profiles-content">
        <h1 className="country-profiles-heading">Country Profiles</h1>
        <p className="country-profiles-subheading">
          Select a letter below to browse countries by name.
        </p>

        {loadError && <p className="country-profiles-error">{loadError}</p>}

        {!loadError && countries === null && (
          <p className="country-profiles-status">Loading countries…</p>
        )}

        {!loadError && countries !== null && !selectedLetter && (
          <p className="country-profiles-status">Choose a letter to see countries.</p>
        )}

        {!loadError && countries !== null && selectedLetter && (
          <ul className="country-profiles-list">
            {filteredCountries.length === 0 && (
              <li className="country-profiles-empty">
                No countries found starting with "{selectedLetter}".
              </li>
            )}
            {filteredCountries.map((c) => (
              <li key={c.code}>
                <Link to="/unavailable" className="country-profiles-list-item">
                  {c.name} Profile
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="country-letter-grid" role="navigation" aria-label="Filter countries by letter">
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            className={
              "country-letter-block" +
              (selectedLetter === letter ? " country-letter-block--active" : "") +
              (!availableLetters.has(letter) && countries !== null ? " country-letter-block--disabled" : "")
            }
            onClick={() => handleLetterClick(letter)}
            disabled={countries !== null && !availableLetters.has(letter)}
            aria-pressed={selectedLetter === letter}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}