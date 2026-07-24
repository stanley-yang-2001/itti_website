import { useMemo, useState } from "react";
import { INDICATOR_VARIABLES, getYearRecord, getNumericValue } from "../../utils/ObservatoryData";
import { summarize, rank, formatNumber } from "../../utils/statsHelpers";
import { colorForCountry } from "../../utils/countryColors";

function chartIndicatorLabel(panels) {
  const set = new Set(panels.map((p) => p.indicator));
  return set.size === 1 ? [...set][0] : "mixed";
}

export default function StatsView({ chartablePanels, countries }) {
  const indicator = chartablePanels.length > 0 ? chartIndicatorLabel(chartablePanels) : null;

  const variableOptions = useMemo(() => {
    if (!indicator) return [];
    if (indicator === "mixed") return [{ key: "__composite__", label: "Composite Score (ETTI / GTBI)" }];
    return INDICATOR_VARIABLES[indicator].filter((v) => v.numeric).map((v) => ({ key: v.key, label: v.label }));
  }, [indicator]);

  const [variableKey, setVariableKey] = useState("");
  const effectiveVariable = variableOptions.some((o) => o.key === variableKey) ? variableKey : variableOptions[0]?.key || "";

  const entries = useMemo(() => {
    if (!effectiveVariable) return [];
    return chartablePanels
      .map((panel) => {
        const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year);
        const key = effectiveVariable === "__composite__" ? (panel.indicator === "ETTI" ? "etti" : "gtbi") : effectiveVariable;
        const value = getNumericValue(record?.[key]);
        return value === null ? null : { label: `${panel.countryName} ${panel.year}`, countryCode: panel.countryCode, value };
      })
      .filter(Boolean);
  }, [chartablePanels, countries, effectiveVariable]);

  const stats = useMemo(() => summarize(entries.map((e) => e.value)), [entries]);
  const ranked = useMemo(() => rank(entries).sort((a, b) => a.rank - b.rank), [entries]);

  if (chartablePanels.length < 2) {
    return <p className="obs-explorer-empty">Check at least 2 data panels above to see summary statistics and a ranking.</p>;
  }

  return (
    <div className="obs-stats-view">
      <div className="obs-stats-toolbar">
        <span className="obs-chart-builder-count">{chartablePanels.length} panels selected</span>
        <select value={effectiveVariable} onChange={(e) => setVariableKey(e.target.value)}>
          {variableOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {!stats ? (
        <p className="obs-explorer-empty">No real values on file for this variable across the selected panels.</p>
      ) : (
        <>
          <div className="obs-stats-summary">
            <div className="obs-stats-stat"><span className="obs-stats-stat-label">Mean</span><span className="obs-stats-stat-value">{formatNumber(stats.mean)}</span></div>
            <div className="obs-stats-stat"><span className="obs-stats-stat-label">Median</span><span className="obs-stats-stat-value">{formatNumber(stats.median)}</span></div>
            <div className="obs-stats-stat"><span className="obs-stats-stat-label">Min</span><span className="obs-stats-stat-value">{formatNumber(stats.min)}</span></div>
            <div className="obs-stats-stat"><span className="obs-stats-stat-label">Max</span><span className="obs-stats-stat-value">{formatNumber(stats.max)}</span></div>
            <div className="obs-stats-stat"><span className="obs-stats-stat-label">Count</span><span className="obs-stats-stat-value">{stats.count}</span></div>
          </div>

          <ol className="obs-stats-rank-list">
            {ranked.map((entry) => (
              <li key={entry.label}>
                <span className="obs-stats-rank-num">#{entry.rank}</span>
                <span className="obs-country-dot" style={{ background: colorForCountry(entry.countryCode) }} />
                <span className="obs-stats-rank-label">{entry.label}</span>
                <span className="obs-stats-rank-value">{formatNumber(entry.value)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}