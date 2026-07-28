import { useState } from "react";

/**
 * Clicking a data panel's body (not its checkbox, not its remove button)
 * opens this to change which country/year that panel points to. Reuses the
 * same "no duplicate country+year" rule as the bulk picker, checked against
 * every other existing panel for the same indicator.
 */
export default function EditPanelModal({ panel, countries, existingKeys, onSave, onCancel }) {
  const [countryCode, setCountryCode] = useState(panel.countryCode);
  const [year, setYear] = useState(panel.year);
  const [error, setError] = useState(null);

  const selectedCountry = countries.find((c) => c.code === countryCode);
  const years = selectedCountry ? selectedCountry.years : [];

  function handleCountryChange(code) {
    setCountryCode(code);
    const c = countries.find((x) => x.code === code);
    setYear(c && c.years.length > 0 ? c.years[0] : null);
    setError(null);
  }

  function handleSave() {
    if (!countryCode || !year) return;
    const key = `${countryCode}:${year}`;
    const isSamePanel = countryCode === panel.countryCode && year === panel.year;
    if (!isSamePanel && existingKeys.has(key)) {
      setError("A data panel for this country and year already exists.");
      return;
    }
    onSave({ countryCode, countryName: selectedCountry?.name || countryCode, year });
  }

  return (
    <div className="obs-modal-overlay" onClick={onCancel}>
      <div className="obs-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit data panel</h3>

        <label className="obs-modal-field">
          <span>Country</span>
          <select value={countryCode} onChange={(e) => handleCountryChange(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="obs-modal-field">
          <span>Year</span>
          <select value={year ?? ""} onChange={(e) => { setYear(Number(e.target.value)); setError(null); }}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        {error && <p className="obs-modal-error">{error}</p>}

        <div className="obs-modal-actions">
          <button type="button" className="obs-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="obs-btn obs-btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}