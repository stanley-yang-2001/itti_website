import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Observatory.css";
import { fetchAllCountries } from "../api.js";
import DataExplorerPanel from "../components/observatory/DataExplorerPanel.jsx";
import AnalysisViews from "../components/observatory/AnalysisViews.jsx";
import NigeriaObservatory from "../components/observatory/NigeriaObservatory.jsx";

// International first: the Observatory's primary purpose is the global
// query tool, with the Nigeria page as a worked example alongside it.
const MAIN_TABS = [
  { key: "international", label: "International Trauma Observatory" },
  { key: "nigeria", label: "Nigeria Trauma Observatory (NTO)" },
];

const INDICATOR_TABS = ["ETTI", "GTBI"];

/**
 * Observatory: dashboards for GTBI and ETTI, plus a data query tool that
 * lets a user assemble country/year data panels (per indicator) and build
 * charts from them - across both indicators at once if they choose to.
 * Panels and charts both live in this component's state (client-side only,
 * beyond the "save chart to profile" call which persists just the chart's
 * config server-side); nothing here mutates the underlying country data.
 */
export default function Observatory() {
  const [countries, setCountries] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [mainTab, setMainTab] = useState("international");
  const [indicatorTab, setIndicatorTab] = useState("ETTI");
  const [panels, setPanels] = useState([]);
  const nextPanelId = useRef(1);

  useEffect(() => {
    let cancelled = false;
    fetchAllCountries()
      .then((data) => { if (!cancelled) setCountries(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, []);

  function handleAddPanels(indicator, selections, countriesWithData) {
    const byCode = Object.fromEntries(countriesWithData.map((c) => [c.code, c.name]));
    setPanels((prev) => [
      ...prev,
      ...selections.map(({ countryCode, year }) => ({
        id: nextPanelId.current++,
        indicator,
        countryCode,
        countryName: byCode[countryCode] || countryCode,
        year,
        selected: false,
      })),
    ]);
  }

  function handleTogglePanelSelect(id) {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }

  function handleEditPanel(id, updates) {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  function handleRemovePanel(id) {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSelectAll(indicator, value) {
    setPanels((prev) => prev.map((p) => (p.indicator === indicator ? { ...p, selected: value } : p)));
  }

  const chartablePanels = panels.filter((p) => p.selected);

  return (
    <div className="obs-page">
      <div className="obs-header">
        <h1 className="display">Observatory</h1>
        <p className="obs-subheading">GTBI and ETTI dashboards, and a data query tool for building your own charts.</p>
      </div>

      <div className="obs-main-tabs" role="tablist">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mainTab === tab.key}
            className={`obs-main-tab${mainTab === tab.key ? " active" : ""}`}
            onClick={() => setMainTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadError && <p className="obs-explorer-empty">Couldn't load country data: {loadError}</p>}

      {!loadError && countries === null && <p className="obs-explorer-empty">Loading Observatory data…</p>}

      {!loadError && countries !== null && mainTab === "international" && (
        <div className="obs-explorer">
          <div className="obs-indicator-tabs" role="tablist">
            {INDICATOR_TABS.map((indicator) => (
              <button
                key={indicator}
                type="button"
                role="tab"
                aria-selected={indicatorTab === indicator}
                className={`obs-indicator-tab${indicatorTab === indicator ? " active" : ""}`}
                onClick={() => setIndicatorTab(indicator)}
              >
                {indicator}
              </button>
            ))}
          </div>

          <DataExplorerPanel
            indicator={indicatorTab}
            countries={countries}
            panels={panels}
            onAddPanels={handleAddPanels}
            onTogglePanelSelect={handleTogglePanelSelect}
            onEditPanel={handleEditPanel}
            onRemovePanel={handleRemovePanel}
            onSelectAll={handleSelectAll}
          />

          <p className="obs-cross-tab-note">
            Data panels from both the ETTI and GTBI tabs can be checked and combined into a single chart, table, or
            stats summary below. The map uses the current {indicatorTab} tab regardless of what's checked.
          </p>

          <AnalysisViews chartablePanels={chartablePanels} countries={countries} activeIndicator={indicatorTab} />
        </div>
      )}

      {!loadError && countries !== null && mainTab === "nigeria" && (
        <NigeriaObservatory countries={countries} />
      )}

      <p className="obs-references-link">
        Data sources and methodology references: <Link to="/docs">Documentation &amp; References</Link>
      </p>
    </div>
  );
}