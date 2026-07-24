import { useState } from "react";
import ChartsSection from "./ChartsSection.jsx";
import WorldMapView from "./WorldMapView.jsx";
import DataTableView from "./DataTableView.jsx";
import StatsView from "./StatsView.jsx";
import TimelineView from "./TimelineView.jsx";

const VIEWS = [
  { key: "chart", label: "Chart" },
  { key: "map", label: "Map" },
  { key: "table", label: "Table" },
  { key: "stats", label: "Stats" },
  { key: "timeline", label: "Timeline" },
];

/**
 * A single tabbed area for every way of looking at the data, instead of
 * stacking a chart, a map, a table, and a stats panel one after another
 * down the page. Only one view renders at a time; switching views doesn't
 * lose your chart(s) - ChartsSection keeps its own state and just
 * unmounts/remounts are avoided by keeping it always mounted, hidden via
 * CSS, so created charts persist across a Map/Table detour.
 */
export default function AnalysisViews({ chartablePanels, countries, activeIndicator }) {
  const [view, setView] = useState("chart");

  return (
    <div className="obs-analysis-views">
      <div className="obs-view-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            className={`obs-view-tab${view === v.key ? " active" : ""}`}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: view === "chart" ? "block" : "none" }}>
        <ChartsSection chartablePanels={chartablePanels} countries={countries} />
      </div>
      {view === "map" && <WorldMapView indicator={activeIndicator} countries={countries} />}
      {view === "table" && <DataTableView chartablePanels={chartablePanels} countries={countries} />}
      {view === "stats" && <StatsView chartablePanels={chartablePanels} countries={countries} />}
      {view === "timeline" && <TimelineView chartablePanels={chartablePanels} countries={countries} />}
    </div>
  );
}