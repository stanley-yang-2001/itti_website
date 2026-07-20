import React, { useState, useEffect } from 'react';
import { getLatestYearRecord, getNumericValue, formatField } from '../utils/countryData.js';

/** Formats a numeric score to 2 decimals, or passes through "Data Pending" as-is. */
function fmt(value) {
  const num = getNumericValue(value);
  return num === null ? formatField(value) : num.toFixed(2);
}

export default function SidePanel({ isOpen, country, record, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Reset to the overview tab whenever a new country is selected.
  useEffect(() => {
    setActiveTab('overview');
  }, [country?.iso]);

  const name = country?.name || 'Select a country';
  const iso = country?.iso || '—';

  // record is the raw /api/countries/<code> response: { name, ETTI: {...}, GTBI: {...} }.
  // Every field inside can be a real number/string or the literal "Data Pending" -
  // always resolve through getLatestYearRecord/getNumericValue/formatField rather
  // than reading record.GTBI.gtbi directly.
  const gtbiLatest = getLatestYearRecord(record?.GTBI) || {};
  const ettiLatest = getLatestYearRecord(record?.ETTI) || {};

  return (
    <aside id="side-panel" className={isOpen ? 'open' : ''}>
      <div className="panel-top">
        <button className="panel-close" id="panel-close" aria-label="Close" onClick={onClose}>
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
              index.
            </p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">GTBI Score</div>
              <div className="v" id="ov-gtbi">{fmt(gtbiLatest.gtbi)}</div>
            </div>
            <div className="metric">
              <div className="k">ETTI Score</div>
              <div className="v" id="ov-etti">{fmt(ettiLatest.etti)}</div>
            </div>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'gtbi' ? ' active' : ''}`} id="tab-gtbi">
          <div className="score-card">
            <p className="score-label">GTBI — Global Trauma Burden Index</p>
            <div className="score-value" id="gtbi-value">{fmt(gtbiLatest.gtbi)}</div>
            <p className="score-desc">
              A composite measure of a country's collective trauma burden, combining mortality (Years of Life Lost)
              and morbidity (Years Lived with Disability) from conflict-related harm.
            </p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">Trauma Level</div>
              <div className="v" id="m-trauma-level">{fmt(gtbiLatest.trauma_level)}</div>
              <div className="full">Categorical severity band</div>
            </div>
            <div className="metric">
              <div className="k">Burden Rate</div>
              <div className="v" id="m-burden-rate">{fmt(gtbiLatest.burden_rate)}</div>
              <div className="full">Per 100,000 population</div>
            </div>
            <div className="metric">
              <div className="k">YLL</div>
              <div className="v" id="m-yll">{fmt(gtbiLatest.yll)}</div>
              <div className="full">Years of Life Lost</div>
            </div>
            <div className="metric">
              <div className="k">YLD</div>
              <div className="v" id="m-yld">{fmt(gtbiLatest.yld)}</div>
              <div className="full">Years Lived with Disability</div>
            </div>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'etti' ? ' active' : ''}`} id="tab-etti">
          <div className="score-card">
            <p className="score-label">ETTI — Composite Score</p>
            <div className="score-value" id="etti-value">{fmt(ettiLatest.etti)}</div>
            <p className="score-desc">ETTI aggregates four underlying variables into a single composite score.</p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">EVS</div>
              <div className="v" id="m-evs">{fmt(ettiLatest.evs)}</div>
              <div className="full">Election Violence Severity</div>
            </div>
            <div className="metric">
              <div className="k">TIE</div>
              <div className="v" id="m-tie">{fmt(ettiLatest.tie)}</div>
              <div className="full">Trust in Electoral Institutions</div>
            </div>
            <div className="metric">
              <div className="k">PDL</div>
              <div className="v" id="m-pdl">{fmt(ettiLatest.pdl)}</div>
              <div className="full">Political Distrust Level</div>
            </div>
            <div className="metric">
              <div className="k">ITS</div>
              <div className="v" id="m-its">{fmt(ettiLatest.its)}</div>
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
    </aside>
  );
}