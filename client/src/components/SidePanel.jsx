import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAvailableYears,
  getYearRecord,
  getNumericValue,
  formatField
} from '../utils/countryData.js';

/** Formats a numeric score to 2 decimals, or passes through "Data Pending" as-is. */
function fmt(value) {
  const num = getNumericValue(value);
  return num === null ? formatField(value) : num.toFixed(2);
}

/** A <select> of the real years available for one index, or a disabled
 *  "No data" placeholder when the country has none for that index. */
function YearSelect({ label, years, value, onChange }) {
  if (years.length === 0) {
    return (
      <div className="year-select-wrap">
        <span className="year-select-label">{label}</span>
        <select className="year-select" disabled>
          <option>No data</option>
        </select>
      </div>
    );
  }
  return (
    <div className="year-select-wrap">
      <span className="year-select-label">{label}</span>
      <select
        className="year-select"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  );
}

export default function SidePanel({ country, record, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [gtbiYear, setGtbiYear] = useState(null);
  const [ettiYear, setEttiYear] = useState(null);

  // record is the raw /api/countries/<code> response: { name, ETTI: {...}, GTBI: {...} }.
  // Every field inside can be a real number/string or the literal "Data Pending" -
  // always resolve through getYearRecord/getNumericValue/formatField rather than
  // reading record.GTBI.gtbi directly.
  const gtbiYears = getAvailableYears(record?.GTBI);
  const ettiYears = getAvailableYears(record?.ETTI);

  // Reset to the overview tab and the latest available year for each index
  // whenever a new country is selected.
  useEffect(() => {
    setActiveTab('overview');
    setGtbiYear(getAvailableYears(record?.GTBI)[0] ?? null);
    setEttiYear(getAvailableYears(record?.ETTI)[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country?.iso]);

  if (!country) {
    return (
      <aside id="side-panel">
        <div className="panel-placeholder">
          <p>Click a country on the globe to see its GTBI and ETTI profile here.</p>
        </div>
      </aside>
    );
  }

  const name = country?.name || 'Select a country';
  const iso = country?.iso || '—';

  const gtbiOverview = getYearRecord(record?.GTBI, gtbiYears[0]) || {};
  const ettiOverview = getYearRecord(record?.ETTI, ettiYears[0]) || {};
  const gtbiSelected = getYearRecord(record?.GTBI, gtbiYear) || {};
  const ettiSelected = getYearRecord(record?.ETTI, ettiYear) || {};

  return (
    <aside id="side-panel">
      <div className="panel-top">
        <button className="panel-close" id="panel-close" aria-label="Clear selection" onClick={onClose}>
          ✕
        </button>
        <p className="country-eyebrow" id="country-code">{iso}</p>
        <h2 className="country-name" id="country-name">{name}</h2>
      </div>

      <div className="tabs">
        {['overview', 'gtbi', 'etti'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            data-tab={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? 'Overview' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="panel-body">
        <div className={`tab-pane${activeTab === 'overview' ? ' active' : ''}`} id="tab-overview">
          <div className="score-card">
            <p className="score-label">Country</p>
            <div className="score-value small" id="ov-name" style={{ fontSize: 24, color: 'var(--text-hi)' }}>
              {name}
            </div>
            <p className="score-desc">
              This profile brings together two composite indices — the Global Trauma Burden Index (GTBI) and the
              Election Trauma &amp; Trust Index (ETTI) — for a single country. Switch tabs above to explore each
              index, including every year we have data for.
            </p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">GTBI Score{gtbiYears[0] ? ` (${gtbiYears[0]})` : ''}</div>
              <div className="v" id="ov-gtbi">{fmt(gtbiOverview.gtbi)}</div>
            </div>
            <div className="metric">
              <div className="k">ETTI Score{ettiYears[0] ? ` (${ettiYears[0]})` : ''}</div>
              <div className="v" id="ov-etti">{fmt(ettiOverview.etti)}</div>
            </div>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'gtbi' ? ' active' : ''}`} id="tab-gtbi">
          <div className="score-card">
            <div className="score-card-head">
              <p className="score-label">GTBI — Global Trauma Burden Index</p>
              <YearSelect label="Year" years={gtbiYears} value={gtbiYear} onChange={setGtbiYear} />
            </div>
            <div className="score-value" id="gtbi-value">{fmt(gtbiSelected.gtbi)}</div>
            <p className="score-desc">
              A composite measure of a country's collective trauma burden, combining mortality (Years of Life Lost)
              and morbidity (Years Lived with Disability) from conflict-related harm.
            </p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">Trauma Level</div>
              <div className="v" id="m-trauma-level">{fmt(gtbiSelected.trauma_level)}</div>
              <div className="full">Categorical severity band</div>
            </div>
            <div className="metric">
              <div className="k">Burden Rate</div>
              <div className="v" id="m-burden-rate">{fmt(gtbiSelected.burden_rate)}</div>
              <div className="full">Per 100,000 population</div>
            </div>
            <div className="metric">
              <div className="k">YLL</div>
              <div className="v" id="m-yll">{fmt(gtbiSelected.yll)}</div>
              <div className="full">Years of Life Lost</div>
            </div>
            <div className="metric">
              <div className="k">YLD</div>
              <div className="v" id="m-yld">{fmt(gtbiSelected.yld)}</div>
              <div className="full">Years Lived with Disability</div>
            </div>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'etti' ? ' active' : ''}`} id="tab-etti">
          <div className="score-card">
            <div className="score-card-head">
              <p className="score-label">ETTI — Composite Score</p>
              <YearSelect label="Year" years={ettiYears} value={ettiYear} onChange={setEttiYear} />
            </div>
            <div className="score-value" id="etti-value">{fmt(ettiSelected.etti)}</div>
            <p className="score-desc">ETTI aggregates four underlying variables into a single composite score.</p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">EVS</div>
              <div className="v" id="m-evs">{fmt(ettiSelected.evs)}</div>
              <div className="full">Election Violence Severity</div>
            </div>
            <div className="metric">
              <div className="k">TIE</div>
              <div className="v" id="m-tie">{fmt(ettiSelected.tie)}</div>
              <div className="full">Trust in Electoral Institutions</div>
            </div>
            <div className="metric">
              <div className="k">PDL</div>
              <div className="v" id="m-pdl">{fmt(ettiSelected.pdl)}</div>
              <div className="full">Political Distrust Level</div>
            </div>
            <div className="metric">
              <div className="k">ITS</div>
              <div className="v" id="m-its">{fmt(ettiSelected.its)}</div>
              <div className="full">Institutional Trust Stability</div>
            </div>
          </div>
          <div className="placeholder-note">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16" r="0.5" fill="currentColor" />
            </svg>
            <span>Fields showing "Data Pending" are awaiting source data and are not yet computable.</span>
          </div>
        </div>
      </div>

      <Link className="panel-observatory-link" to="/observatory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        </svg>
        <span>Check out our observatory for more information</span>
      </Link>
    </aside>
  );
}