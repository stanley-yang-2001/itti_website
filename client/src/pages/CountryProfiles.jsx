import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/CountryProfiles.css";
import { isDataPending, getNumericValue, getLatestYearRecord } from "../utils/countryData";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Country Profiles page. Shows an A-Z grid of letters (two rows of 13)
 * fixed at the top of the page, with the country list below it.
 * Clicking a letter filters the list to countries whose name starts
 * with that letter. The grid stays visible at all times so the user
 * can switch letters freely.
 *
 * country_data.json fields are never assumed to be numbers - every
 * ETTI/GTBI field can be the literal string "Data Pending" instead of
 * a real value (see utils/countryData.js), so any place this component
 * reads a numeric field goes through getNumericValue()/isDataPending()
 * rather than comparing or doing math on the raw value directly.
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
        // fall back to the key if a record has no name yet. Each
        // record's ETTI/GTBI sections are year-keyed and may contain
        // "Data Pending" fields - not read on this page today, but kept
        // alongside the country in case a future summary (e.g. a small
        // "Low/Data Pending" badge) is added here.
        const list = Object.entries(data).map(([code, record]) => {
          const latestGtbi = getLatestYearRecord(record?.GTBI);
          const latestEtti = getLatestYearRecord(record?.ETTI);
          return {
            code,
            name: record?.name || code,
            gtbiScore: getNumericValue(latestGtbi?.gtbi),
            ettiScore: getNumericValue(latestEtti?.etti),
          };
        });
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

      <div className="country-profiles-content">
        <h1 className="country-profiles-heading">Country Profiles</h1>
        <p className="country-profiles-subheading">
          Select a letter above to browse countries by name.
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
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}