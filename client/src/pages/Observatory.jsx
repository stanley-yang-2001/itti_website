import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import "../styles/Observatory.css";
import { fetchAllCountries, fetchSavedObservatoryChart } from "../api.js";
import { getCountriesWithData } from "../utils/ObservatoryData";
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
  const { hash } = useLocation();
  const [mainTab, setMainTab] = useState(() => (hash === "#nigeria" ? "nigeria" : "international"));
  const [indicatorTab, setIndicatorTab] = useState("ETTI");
  const [panels, setPanels] = useState([]);
  const nextPanelId = useRef(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [restoreStatus, setRestoreStatus] = useState(null); // null | "loading" | "error" | "done"

  useEffect(() => {
    let cancelled = false;
    fetchAllCountries()
      .then((data) => { if (!cancelled) setCountries(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, []);

  // Restoring a chart from a profile Favorites link (?chart=<id>): only
  // the config (indicator/panels/chart type) was ever persisted server-
  // side - see server/app.py's comment on the saved-charts routes for why
  // - so this re-adds and re-checks the same panels rather than trying to
  // reconstruct a rendered chart. It lands the user one "Create Chart"
  // click away from what they saved, on the Charts view, instead of
  // silently guessing at ChartsSection's own internal variable/type state.
  useEffect(() => {
    const chartId = searchParams.get("chart");
    if (!chartId || countries === null || restoreStatus !== null) return;

    setRestoreStatus("loading");
    fetchSavedObservatoryChart(chartId)
      .then((chart) => {
        const config = chart.config || {};
        const configPanels = Array.isArray(config.panels) ? config.panels : [];
        if (configPanels.length === 0) {
          setRestoreStatus("error");
          return;
        }

        setPanels((prev) => [
          ...prev,
          ...configPanels.map((p) => ({
            id: nextPanelId.current++,
            indicator: p.indicator,
            countryCode: p.countryCode,
            countryName: p.countryName,
            year: p.year,
            selected: true,
          })),
        ]);

        const firstIndicator = configPanels[0]?.indicator;
        if (firstIndicator === "ETTI" || firstIndicator === "GTBI") {
          setIndicatorTab(firstIndicator);
        }
        setMainTab("international");
        setRestoreStatus("done");

        // Drop ?chart= from the URL once handled, so refreshing/re-visiting
        // doesn't re-add the same panels a second time.
        setSearchParams((next) => {
          next.delete("chart");
          return next;
        }, { replace: true });
      })
      .catch(() => setRestoreStatus("error"));
  }, [countries, searchParams, restoreStatus, setSearchParams]);

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

  /** Adds a data panel for every country/year on file, across BOTH GTBI
   *  and ETTI at once, skipping anything already added (per indicator,
   *  same de-dup rule the normal picker uses). */
  function handleSelectAllData() {
    if (!countries) return;
    setPanels((prev) => {
      let next = prev;
      for (const indicator of ["GTBI", "ETTI"]) {
        const countriesWithData = getCountriesWithData(countries, indicator);
        const existingKeys = new Set(
          next.filter((p) => p.indicator === indicator).map((p) => `${p.countryCode}:${p.year}`)
        );
        const additions = [];
        countriesWithData.forEach((c) => {
          c.years.forEach((year) => {
            const key = `${c.code}:${year}`;
            if (!existingKeys.has(key)) {
              additions.push({
                id: nextPanelId.current++,
                indicator,
                countryCode: c.code,
                countryName: c.name,
                year,
                selected: false,
              });
            }
          });
        });
        next = [...next, ...additions];
      }
      return next;
    });
  }

  const chartablePanels = panels.filter((p) => p.selected);

  return (
    <div className="obs-page">
      <div className="obs-header">
        <h1 className="display">Observatory</h1>
        <p className="obs-subheading">GTBI and ETTI dashboards, and a data query tool for building your own charts.</p>
      </div>

      {restoreStatus === "loading" && (
        <p className="obs-restore-banner">Loading your saved chart's data panels…</p>
      )}
      {restoreStatus === "done" && (
        <p className="obs-restore-banner obs-restore-banner--done">
          Your saved chart's data panels are loaded and checked below — select a chart type and variable, then
          Create Chart to rebuild it.
        </p>
      )}
      {restoreStatus === "error" && (
        <p className="obs-restore-banner obs-restore-banner--error">
          Couldn't load that saved chart. It may have been deleted.
        </p>
      )}

      <div className="obs-main-tabs" role="tablist">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={tab.key}
            aria-selected={mainTab === tab.key}
            className={`obs-main-tab${mainTab === tab.key ? " active" : ""}`}
            onClick={() => {
              setMainTab(tab.key);
              window.history.replaceState(null, "", `#${tab.key}`);
            }}
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
            onSelectAllData={handleSelectAllData}
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
        New here? <Link to="/docs#user-guide">Read the user guide</Link> for how to use the query tool, build
        charts, and read the Nigeria tab. Data sources and methodology references: <Link to="/docs">Documentation &amp; References</Link>
      </p>
    </div>
  );
}