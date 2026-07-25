import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ZAxis,
} from "recharts";
import { useAuth } from "../../context/AuthContext.jsx";
import { INDICATOR_VARIABLES, GTBI_EXPOSURE_TYPES, getYearRecord, getNumericValue } from "../../utils/ObservatoryData";
import { colorForCountry } from "../../utils/countryColors";
import { saveObservatoryChart } from "../../api.js";

let chartIdSeq = 1;

const DOMAIN_COLORS = { evs: "#4FD9C7", tie: "#E8B84B", pdl: "#E86B6B", its: "#B98BD8" };

function getPanelValue(panel, countries, variableKey) {
  const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year);
  const key = variableKey === "__composite__" ? (panel.indicator === "ETTI" ? "etti" : "gtbi") : variableKey;
  return getNumericValue(record?.[key]);
}

function uniqueCountries(panels) {
  const map = new Map();
  panels.forEach((p) => {
    if (!map.has(p.countryCode)) {
      map.set(p.countryCode, { code: p.countryCode, name: p.countryName, color: colorForCountry(p.countryCode) });
    }
  });
  return [...map.values()];
}

function chartIndicatorLabel(panels) {
  const set = new Set(panels.map((p) => p.indicator));
  return set.size === 1 ? [...set][0] : "mixed";
}

const CHART_TYPES = [
  { key: "bar", label: "Bar chart", available: () => true },
  { key: "line", label: "Line chart", available: () => true },
  { key: "pie", label: "Pie chart", available: () => true },
  { key: "radar", label: "Radar chart", available: (indicator) => indicator !== "mixed" },
  { key: "scatter", label: "Scatter plot (2 variables)", available: (indicator) => indicator !== "mixed" },
  { key: "stackedDomain", label: "Stacked bar: ETTI domain breakdown", available: (indicator) => indicator === "ETTI" },
  { key: "stackedExposure", label: "Stacked bar: GTBI exposure-type breakdown (YLL)", available: (indicator) => indicator === "GTBI" },
];

/**
 * Builds render-ready data for the chosen chart type. Structural shapes:
 *   - bar / pie: one "slice" per data panel, each carrying its own
 *     country color.
 *   - line / radar: one row per x-axis point (year, or variable name for
 *     the single-panel "all variables" case) with ONE COLUMN PER COUNTRY,
 *     so each country renders as its own colored line/radar series
 *     instead of one line zig-zagging between unrelated countries.
 *   - scatter: one point per panel with x/y from two chosen variables.
 *   - stackedDomain: one bar per panel, stacked into its 4 ETTI domain
 *     scores (EVS/TIE/PDL/ITS), colored by domain rather than by country.
 */
function buildChartPayload(panels, countries, variableKey, chartType) {
  if (chartType === "stackedDomain") {
    const data = panels.map((panel) => {
      const record = getYearRecord(countries, "ETTI", panel.countryCode, panel.year);
      return {
        name: `${panel.countryName} ${panel.year}`,
        evs: getNumericValue(record?.evs) ?? 0,
        tie: getNumericValue(record?.tie) ?? 0,
        pdl: getNumericValue(record?.pdl) ?? 0,
        its: getNumericValue(record?.its) ?? 0,
      };
    });
    return { data, seriesKeys: [], xKey: "name", mode: "stacked" };
  }

  if (chartType === "stackedExposure") {
    const data = panels.map((panel) => {
      const record = getYearRecord(countries, "GTBI", panel.countryCode, panel.year);
      const row = { name: `${panel.countryName} ${panel.year}` };
      GTBI_EXPOSURE_TYPES.forEach((t) => {
        row[t.key] = getNumericValue(record?.[`${t.key}_yll`]) ?? 0;
      });
      return row;
    });
    return { data, seriesKeys: [], xKey: "name", mode: "stacked" };
  }

  if (variableKey === "__all__") {
    // Exactly one panel, comparing all of that panel's numeric variables.
    const panel = panels[0];
    const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year);
    const allVars = INDICATOR_VARIABLES[panel.indicator].filter((v) => v.numeric);
    // Radar with 18 ETTI sub-variable axes isn't readable - restrict to
    // the composite/domain-level scores there; bar/line/pie keep the full breakdown.
    const vars = chartType === "radar" ? allVars.filter((v) => !v.key.includes("_")) : allVars;
    const color = colorForCountry(panel.countryCode);

    if (chartType === "radar") {
      const data = vars.map((v) => ({ axis: v.label, [panel.countryCode]: getNumericValue(record?.[v.key]) ?? 0 }));
      return { data, seriesKeys: [{ key: panel.countryCode, name: panel.countryName, color }], xKey: "axis", mode: "grouped" };
    }
    const data = vars.map((v) => ({ name: v.label, value: getNumericValue(record?.[v.key]) ?? 0, color }));
    return { data, seriesKeys: [{ key: "value", name: panel.countryName, color }], xKey: "name", mode: "flat" };
  }

  if (chartType === "line" || chartType === "radar") {
    const countryList = uniqueCountries(panels);
    const seriesKeys = countryList.map((c) => ({ key: c.code, name: c.name, color: c.color }));

    if (chartType === "line") {
      const years = [...new Set(panels.map((p) => p.year))].sort((a, b) => a - b);
      const data = years.map((year) => {
        const row = { year: String(year) };
        countryList.forEach((c) => {
          const panel = panels.find((p) => p.countryCode === c.code && p.year === year);
          row[c.code] = panel ? getPanelValue(panel, countries, variableKey) ?? undefined : undefined;
        });
        return row;
      });
      return { data, seriesKeys, xKey: "year", mode: "grouped" };
    }

    // radar: one axis per top-level composite/domain score (not the raw
    // sub-variables), one series per country using that country's most
    // recent selected year.
    const indicator = chartIndicatorLabel(panels);
    const vars = indicator === "mixed" ? [] : INDICATOR_VARIABLES[indicator].filter((v) => v.numeric && !v.key.includes("_"));
    const data = vars.map((v) => {
      const row = { axis: v.label };
      countryList.forEach((c) => {
        const latest = panels.filter((p) => p.countryCode === c.code).sort((a, b) => b.year - a.year)[0];
        const record = getYearRecord(countries, latest.indicator, latest.countryCode, latest.year);
        row[c.code] = getNumericValue(record?.[v.key]) ?? 0;
      });
      return row;
    });
    return { data, seriesKeys, xKey: "axis", mode: "grouped" };
  }

  // bar / pie: flat, one slice per panel, colored by that panel's country.
  const data = panels.map((panel) => ({
    name: `${panel.countryName} ${panel.year}`,
    value: getPanelValue(panel, countries, variableKey) ?? 0,
    color: colorForCountry(panel.countryCode),
  }));
  return { data, seriesKeys: uniqueCountries(panels).map((c) => ({ key: c.code, name: c.name, color: c.color })), xKey: "name", mode: "flat" };
}

function buildScatterPayload(panels, countries, xVariable, yVariable) {
  const data = panels
    .map((panel) => {
      const x = getPanelValue(panel, countries, xVariable);
      const y = getPanelValue(panel, countries, yVariable);
      if (x === null || y === null) return null;
      return { x, y, name: `${panel.countryName} ${panel.year}`, color: colorForCountry(panel.countryCode) };
    })
    .filter(Boolean);
  return { data, seriesKeys: uniqueCountries(panels).map((c) => ({ key: c.code, name: c.name, color: c.color })), mode: "scatter" };
}

/** Splits a built chart's own logic per-country, for the "small multiples" toggle. */
function buildSmallMultiples(panels, countries, variableKey, chartType) {
  const countryList = uniqueCountries(panels);
  return countryList.map((c) => {
    const countryPanels = panels.filter((p) => p.countryCode === c.code);
    const payload = buildChartPayload(countryPanels, countries, variableKey, chartType);
    return { countryCode: c.code, countryName: c.name, color: c.color, ...payload };
  });
}

function downloadChartSvg(containerEl, filename) {
  const svg = containerEl?.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * chartablePanels: the currently-checked data panels (from either or both
 * indicator tabs) that a new chart can be built from. Charts created here
 * are self-contained (own computed `data`), so deleting or editing the
 * source data panels afterward doesn't retroactively change a chart
 * that's already been made.
 */
export default function ChartsSection({ chartablePanels, countries }) {
  const { isAuthenticated } = useAuth();
  const [charts, setCharts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [chartType, setChartType] = useState("bar");
  const [variableKey, setVariableKey] = useState("");
  const [xVariableKey, setXVariableKey] = useState("");
  const [yVariableKey, setYVariableKey] = useState("");
  const [splitByCountry, setSplitByCountry] = useState(false);
  const [saveStatus, setSaveStatus] = useState({}); // chartId -> "saving"|"saved"|"error"
  const chartViewRef = useRef(null);

  const indicatorOfSelection = chartablePanels.length > 0 ? chartIndicatorLabel(chartablePanels) : null;
  const distinctCountryCount = useMemo(() => uniqueCountries(chartablePanels).length, [chartablePanels]);

  const chartTypeOptions = CHART_TYPES.filter((t) => t.available(indicatorOfSelection));
  const effectiveChartType = chartTypeOptions.some((t) => t.key === chartType) ? chartType : "bar";

  const variableOptions = useMemo(() => {
    if (chartablePanels.length === 0 || effectiveChartType === "stackedDomain" || effectiveChartType === "stackedExposure") return [];
    if (indicatorOfSelection === "mixed") {
      return [{ key: "__composite__", label: "Composite Score (ETTI / GTBI)", group: "Composite" }];
    }
    const opts = INDICATOR_VARIABLES[indicatorOfSelection]
      .filter((v) => v.numeric)
      .map((v) => ({ key: v.key, label: v.label, group: v.group || "Variables" }));
    if (chartablePanels.length === 1 && effectiveChartType !== "scatter") {
      opts.unshift({ key: "__all__", label: "All variables (this panel)", group: "Composite" });
    }
    return opts;
  }, [chartablePanels, indicatorOfSelection, effectiveChartType]);

  const variableGroups = useMemo(() => {
    const groups = [];
    const byGroup = new Map();
    for (const opt of variableOptions) {
      if (!byGroup.has(opt.group)) {
        const list = [];
        byGroup.set(opt.group, list);
        groups.push({ name: opt.group, options: list });
      }
      byGroup.get(opt.group).push(opt);
    }
    return groups;
  }, [variableOptions]);

  const effectiveVariable = variableOptions.some((o) => o.key === variableKey) ? variableKey : variableOptions[0]?.key || "";
  const effectiveXVariable = variableOptions.some((o) => o.key === xVariableKey) ? xVariableKey : variableOptions[0]?.key || "";
  const effectiveYVariable = variableOptions.some((o) => o.key === yVariableKey) ? yVariableKey : variableOptions[1]?.key || variableOptions[0]?.key || "";

  const canSplitByCountry = distinctCountryCount > 1 && (effectiveChartType === "bar" || effectiveChartType === "line") && variableKey !== "__all__";

  function handleCreateChart() {
    if (chartablePanels.length === 0) return;
    let chart;

    if (effectiveChartType === "scatter") {
      if (!effectiveXVariable || !effectiveYVariable) return;
      const { data, seriesKeys } = buildScatterPayload(chartablePanels, countries, effectiveXVariable, effectiveYVariable);
      const xLabel = variableOptions.find((o) => o.key === effectiveXVariable)?.label || effectiveXVariable;
      const yLabel = variableOptions.find((o) => o.key === effectiveYVariable)?.label || effectiveYVariable;
      chart = {
        id: chartIdSeq++,
        title: `${xLabel} vs. ${yLabel}`,
        chartType: "scatter",
        indicator: indicatorOfSelection,
        panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
        data, seriesKeys, xLabel, yLabel, mode: "scatter",
      };
    } else if (effectiveChartType === "stackedDomain") {
      const { data, xKey } = buildChartPayload(chartablePanels, countries, null, "stackedDomain");
      chart = {
        id: chartIdSeq++,
        title: `ETTI domain breakdown — ${chartablePanels.length === 1 ? chartablePanels[0].countryName : `${distinctCountryCount} countries`}`,
        chartType: "stackedDomain",
        indicator: "ETTI",
        panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
        data, xKey, seriesKeys: [], mode: "stacked",
      };
    } else if (effectiveChartType === "stackedExposure") {
      const { data, xKey } = buildChartPayload(chartablePanels, countries, null, "stackedExposure");
      chart = {
        id: chartIdSeq++,
        title: `GTBI exposure-type YLL breakdown — ${chartablePanels.length === 1 ? chartablePanels[0].countryName : `${distinctCountryCount} countries`}`,
        chartType: "stackedExposure",
        indicator: "GTBI",
        panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
        data, xKey, seriesKeys: [], mode: "stacked",
      };
    } else {
      if (!effectiveVariable) return;
      const variableLabel = variableOptions.find((o) => o.key === effectiveVariable)?.label || effectiveVariable;
      const base = { variableKey: effectiveVariable, variableLabel };
      if (splitByCountry && canSplitByCountry) {
        const perCountry = buildSmallMultiples(chartablePanels, countries, effectiveVariable, effectiveChartType);
        chart = {
          id: chartIdSeq++,
          title: `${variableLabel} — split by country`,
          chartType: effectiveChartType,
          indicator: indicatorOfSelection,
          panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
          splitByCountry: true, perCountry, ...base,
        };
      } else {
        const { data, seriesKeys, xKey, mode } = buildChartPayload(chartablePanels, countries, effectiveVariable, effectiveChartType);
        chart = {
          id: chartIdSeq++,
          title: `${variableLabel} — ${chartablePanels.length === 1 ? chartablePanels[0].countryName : `${distinctCountryCount} countries`}`,
          chartType: effectiveChartType,
          indicator: indicatorOfSelection,
          panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
          data, seriesKeys, xKey, mode, ...base,
        };
      }
    }

    setCharts((prev) => [...prev, chart]);
    setActiveIndex(charts.length); // jump to the newly-created chart
  }

  function handleDelete(id) {
    setCharts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }

  function handleDownload(chart) {
    downloadChartSvg(chartViewRef.current, chart.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
  }

  async function handleSave(chart) {
    if (!isAuthenticated) {
      setSaveStatus((s) => ({ ...s, [chart.id]: "error" }));
      return;
    }
    setSaveStatus((s) => ({ ...s, [chart.id]: "saving" }));
    try {
      await saveObservatoryChart(chart.title, chart.indicator === "mixed" ? "mixed" : chart.indicator, {
        chartType: chart.chartType,
        variableKey: chart.variableKey,
        variableLabel: chart.variableLabel,
        panels: chart.panels,
      });
      setSaveStatus((s) => ({ ...s, [chart.id]: "saved" }));
    } catch {
      setSaveStatus((s) => ({ ...s, [chart.id]: "error" }));
    }
  }

  const activeChart = charts[activeIndex];
  const canCreate = chartablePanels.length > 0
    && (effectiveChartType === "stackedDomain" || effectiveChartType === "stackedExposure"
      || (effectiveChartType === "scatter" ? !!effectiveXVariable && !!effectiveYVariable : !!effectiveVariable));

  return (
    <div className="obs-charts-section">
      <div className="obs-chart-builder">
        <span className="obs-chart-builder-count">
          {chartablePanels.length === 0
            ? "Check a data panel above to build a chart."
            : `${chartablePanels.length} panel${chartablePanels.length > 1 ? "s" : ""} · ${distinctCountryCount} countr${distinctCountryCount > 1 ? "ies" : "y"}`}
        </span>

        <select value={effectiveChartType} onChange={(e) => setChartType(e.target.value)} disabled={chartablePanels.length === 0}>
          {chartTypeOptions.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        {effectiveChartType === "scatter" ? (
          <>
            <select value={effectiveXVariable} onChange={(e) => setXVariableKey(e.target.value)} disabled={chartablePanels.length === 0}>
              {variableGroups.map((g) => (
                <optgroup key={g.name} label={`X: ${g.name}`}>
                  {g.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
            <select value={effectiveYVariable} onChange={(e) => setYVariableKey(e.target.value)} disabled={chartablePanels.length === 0}>
              {variableGroups.map((g) => (
                <optgroup key={g.name} label={`Y: ${g.name}`}>
                  {g.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </>
        ) : effectiveChartType === "stackedDomain" ? (
          <span className="obs-chart-builder-note">Uses EVS / TIE / PDL / ITS for each selected panel</span>
        ) : effectiveChartType === "stackedExposure" ? (
          <span className="obs-chart-builder-note">Uses each GTBI exposure type's YLL for each selected panel</span>
        ) : (
          <select value={effectiveVariable} onChange={(e) => setVariableKey(e.target.value)} disabled={chartablePanels.length === 0}>
            {variableGroups.map((g) => (
              <optgroup key={g.name} label={g.name}>
                {g.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        )}

        {canSplitByCountry && (
          <label className="obs-split-toggle">
            <input type="checkbox" checked={splitByCountry} onChange={(e) => setSplitByCountry(e.target.checked)} />
            Split by country
          </label>
        )}

        <button type="button" className="obs-btn obs-btn-primary" disabled={!canCreate} onClick={handleCreateChart}>
          Create chart
        </button>
      </div>

      {charts.length === 0 ? (
        <p className="obs-charts-empty">No charts yet. Select data panels and create one above.</p>
      ) : (
        <div className="obs-chart-slideshow">
          <div className="obs-chart-slideshow-nav">
            <button type="button" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))} disabled={activeIndex === 0}>‹</button>
            <span>{activeIndex + 1} / {charts.length}</span>
            <button type="button" onClick={() => setActiveIndex((i) => Math.min(charts.length - 1, i + 1))} disabled={activeIndex === charts.length - 1}>›</button>
          </div>

          <div className="obs-chart-card">
            <h4>{activeChart.title}</h4>
            <div className="obs-chart-view" ref={chartViewRef}>
              {activeChart.splitByCountry ? (
                <div className="obs-small-multiples-grid">
                  {activeChart.perCountry.map((sub) => (
                    <div key={sub.countryCode} className="obs-small-multiple">
                      <h5><span className="obs-country-dot" style={{ background: sub.color }} />{sub.countryName}</h5>
                      <ChartView chart={{ ...sub, variableLabel: activeChart.variableLabel }} height={160} />
                    </div>
                  ))}
                </div>
              ) : (
                <ChartView chart={activeChart} />
              )}
            </div>

            <div className="obs-chart-card-actions">
              <button type="button" className="obs-btn obs-btn-danger" onClick={() => handleDelete(activeChart.id)}>Delete</button>
              <button type="button" className="obs-btn" onClick={() => handleDownload(activeChart)}>Download</button>
              <button type="button" className="obs-btn obs-btn-primary" onClick={() => handleSave(activeChart)}>
                {saveStatus[activeChart.id] === "saving" ? "Saving…" : saveStatus[activeChart.id] === "saved" ? "Saved ✓" : "Save to profile"}
              </button>
            </div>
            {saveStatus[activeChart.id] === "error" && (
              <p className="obs-modal-error">
                {isAuthenticated ? "Couldn't save this chart. Try again." : "Log in to save charts to your profile."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlatLegend({ items }) {
  if (items.length <= 1) return null;
  return (
    <div className="obs-chart-legend">
      {items.map((item) => (
        <span key={item.key} className="obs-chart-legend-item">
          <span className="obs-country-dot" style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

const TOOLTIP_STYLE = { background: "#0E1626", border: "1px solid #1D2A3E", color: "#EAF1F5" };

export function ChartView({ chart, height = 280 }) {
  const { chartType, data, seriesKeys, xKey, variableLabel } = chart;

  if (chartType === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={chart.xLabel} stroke="#9FB0C3" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={chart.yLabel} stroke="#9FB0C3" tick={{ fontSize: 11 }} />
          <ZAxis range={[80, 80]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={TOOLTIP_STYLE} formatter={(v) => v} />
          <Scatter data={data}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "stackedDomain") {
    return (
      <>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#9FB0C3" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
            <YAxis stroke="#9FB0C3" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="evs" name="EVS" stackId="etti" fill={DOMAIN_COLORS.evs} />
            <Bar dataKey="tie" name="TIE" stackId="etti" fill={DOMAIN_COLORS.tie} />
            <Bar dataKey="pdl" name="PDL" stackId="etti" fill={DOMAIN_COLORS.pdl} />
            <Bar dataKey="its" name="ITS" stackId="etti" fill={DOMAIN_COLORS.its} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (chartType === "stackedExposure") {
    return (
      <>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#9FB0C3" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
            <YAxis stroke="#9FB0C3" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            {GTBI_EXPOSURE_TYPES.map((t, i) => (
              <Bar
                key={t.key}
                dataKey={t.key}
                name={t.label}
                stackId="gtbi"
                fill={t.color}
                radius={i === GTBI_EXPOSURE_TYPES.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (chartType === "pie") {
    return (
      <>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={Math.min(100, height / 2.6)} label={({ name }) => name}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <FlatLegend items={seriesKeys} />
      </>
    );
  }

  if (chartType === "radar") {
    return (
      <ResponsiveContainer width="100%" height={height + 20}>
        <RadarChart data={data} outerRadius={Math.min(100, height / 2.6)}>
          <PolarGrid stroke="#1D2A3E" />
          <PolarAngleAxis dataKey={xKey} tick={{ fill: "#9FB0C3", fontSize: 11 }} />
          <PolarRadiusAxis stroke="#1D2A3E" tick={{ fill: "#9FB0C3", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {seriesKeys.length > 1 && <Legend />}
          {seriesKeys.map((s) => (
            <Radar key={s.key} name={s.name} dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.18} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} stroke="#9FB0C3" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9FB0C3" />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {seriesKeys.length > 1 && <Legend />}
          {seriesKeys.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} stroke="#9FB0C3" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
          <YAxis stroke="#9FB0C3" />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" name={variableLabel} radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <FlatLegend items={seriesKeys} />
    </>
  );
}