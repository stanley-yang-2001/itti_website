import React, { useState, useEffect } from 'react';

function fmt(n) {
  return Number(n ?? 0).toFixed(2);
}

export default function SidePanel({ isOpen, country, metrics, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Reset to the overview tab whenever a new country is selected.
  useEffect(() => {
    setActiveTab('overview');
  }, [country?.iso]);

  const name = country?.name || 'Select a country';
  const iso = country?.iso || '—';
  const m = metrics || { gtbi: 0, etti: 0, evs: 0, tie: 0, pdl: 0, its: 0 };

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
              This profile brings together two composite indices — the Global Trade Balance Index (GTBI) and the
              Economic Trade &amp; Transformation Index (ETTI) — for a single country. Switch tabs above to explore
              each index.
            </p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">GTBI Score</div>
              <div className="v" id="ov-gtbi">{fmt(m.gtbi)}</div>
            </div>
            <div className="metric">
              <div className="k">ETTI Score</div>
              <div className="v" id="ov-etti">{fmt(m.etti)}</div>
            </div>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'gtbi' ? ' active' : ''}`} id="tab-gtbi">
          <div className="score-card">
            <p className="score-label">GTBI — Global Trade Balance Index</p>
            <div className="score-value" id="gtbi-value">{fmt(m.gtbi)}</div>
            <p className="score-desc">
              A composite measure of a country&rsquo;s overall trade balance position. Data is currently a
              placeholder and will populate once live figures are connected.
            </p>
          </div>
        </div>

        <div className={`tab-pane${activeTab === 'etti' ? ' active' : ''}`} id="tab-etti">
          <div className="score-card">
            <p className="score-label">ETTI — Composite Score</p>
            <div className="score-value" id="etti-value">{fmt(m.etti)}</div>
            <p className="score-desc">ETTI aggregates four underlying variables into a single composite score.</p>
          </div>
          <div className="metric-grid">
            <div className="metric">
              <div className="k">EVS</div>
              <div className="v" id="m-evs">{fmt(m.evs)}</div>
              <div className="full">Export Volatility Score</div>
            </div>
            <div className="metric">
              <div className="k">TIE</div>
              <div className="v" id="m-tie">{fmt(m.tie)}</div>
              <div className="full">Trade Integration Efficiency</div>
            </div>
            <div className="metric">
              <div className="k">PDL</div>
              <div className="v" id="m-pdl">{fmt(m.pdl)}</div>
              <div className="full">Production Diversification Level</div>
            </div>
            <div className="metric">
              <div className="k">ITS</div>
              <div className="v" id="m-its">{fmt(m.its)}</div>
              <div className="full">Institutional Trade Stability</div>
            </div>
          </div>
          <div className="placeholder-note">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16" r="0.5" fill="currentColor" />
            </svg>
            <span>All values shown are placeholders (0) pending live data integration.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
