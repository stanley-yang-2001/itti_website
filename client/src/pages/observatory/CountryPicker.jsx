import { useState } from "react";

/**
 * Popout picker used by the "Select Data" button. Shows every country that
 * has at least one real (non "Data Pending") year on file for the active
 * indicator, each as a row with a checkbox. Clicking the row (not the
 * checkbox) expands it into a dropdown list of that country's available
 * years, each with its own checkbox.
 *
 * Checking a country selects ALL of its years. Checking/unchecking an
 * individual year updates that year alone and keeps the country checkbox in
 * sync (checked only when every year is checked).
 *
 * existingKeys is a Set of "code:year" strings already turned into data
 * panels, so a country/year combo that already exists renders disabled
 * rather than letting the user create a duplicate panel.
 */
export default function CountryPicker({ indicator, countries, existingKeys, onConfirm, onClose }) {
  const [expanded, setExpanded] = useState(null); // country code currently expanded
  const [checkedYears, setCheckedYears] = useState({}); // { [code]: Set(years) }
  const [search, setSearch] = useState("");

  function yearsChecked(code) {
    return checkedYears[code] || new Set();
  }

  function isCountryFullyChecked(country) {
    const checked = yearsChecked(country.code);
    const selectable = country.years.filter((y) => !existingKeys.has(`${country.code}:${y}`));
    return selectable.length > 0 && selectable.every((y) => checked.has(y));
  }

  function toggleCountry(country) {
    const nowChecked = !isCountryFullyChecked(country);
    setCheckedYears((prev) => {
      const next = { ...prev };
      if (nowChecked) {
        const selectable = country.years.filter((y) => !existingKeys.has(`${country.code}:${y}`));
        next[country.code] = new Set(selectable);
      } else {
        next[country.code] = new Set();
      }
      return next;
    });
  }

  function toggleYear(code, year) {
    setCheckedYears((prev) => {
      const set = new Set(prev[code] || []);
      if (set.has(year)) set.delete(year);
      else set.add(year);
      return { ...prev, [code]: set };
    });
  }

  function handleConfirm() {
    const selections = [];
    for (const [code, years] of Object.entries(checkedYears)) {
      for (const year of years) {
        if (!existingKeys.has(`${code}:${year}`)) selections.push({ countryCode: code, year });
      }
    }
    onConfirm(selections);
  }

  const filtered = countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalChecked = Object.values(checkedYears).reduce((sum, s) => sum + s.size, 0);

  return (
    <div className="obs-picker-overlay" onClick={onClose}>
      <div className="obs-picker-panel" onClick={(e) => e.stopPropagation()}>
        <div className="obs-picker-header">
          <h3>Select {indicator} data</h3>
          <button type="button" className="obs-picker-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <input
          type="text"
          className="obs-picker-search"
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="obs-picker-list">
          {filtered.length === 0 && <p className="obs-picker-empty">No countries with {indicator} data recorded.</p>}
          {filtered.map((country) => {
            const isExpanded = expanded === country.code;
            const fullyChecked = isCountryFullyChecked(country);
            const partiallyChecked = !fullyChecked && yearsChecked(country.code).size > 0;
            return (
              <div key={country.code} className="obs-picker-row">
                <div className="obs-picker-row-main">
                  <input
                    type="checkbox"
                    checked={fullyChecked}
                    ref={(el) => el && (el.indeterminate = partiallyChecked)}
                    onChange={() => toggleCountry(country)}
                    aria-label={`Select all years for ${country.name}`}
                  />
                  <button
                    type="button"
                    className="obs-picker-country-btn"
                    onClick={() => setExpanded(isExpanded ? null : country.code)}
                  >
                    <span>{country.name}</span>
                    <span className={`obs-picker-caret${isExpanded ? " open" : ""}`}>▾</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="obs-picker-years">
                    {country.years.map((year) => {
                      const alreadyExists = existingKeys.has(`${country.code}:${year}`);
                      return (
                        <label key={year} className={`obs-picker-year${alreadyExists ? " disabled" : ""}`}>
                          <input
                            type="checkbox"
                            checked={alreadyExists || yearsChecked(country.code).has(year)}
                            disabled={alreadyExists}
                            onChange={() => toggleYear(country.code, year)}
                          />
                          {year}
                          {alreadyExists && <span className="obs-picker-year-tag">already added</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="obs-picker-footer">
          <span>{totalChecked} selected</span>
          <button type="button" className="obs-btn obs-btn-primary" disabled={totalChecked === 0} onClick={handleConfirm}>
            Add to selected data
          </button>
        </div>
      </div>
    </div>
  );
}