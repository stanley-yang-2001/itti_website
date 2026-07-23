import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext.jsx";
import { INDICATOR_VARIABLES, getYearRecord, getNumericValue } from "../../utils/observatoryData";
import { saveObservatoryChart } from "../../api.js";

let chartIdSeq = 1;

function buildChartData(panels, countries, variableKey) {
  if (panels.length === 1 && variableKey === "__all__") {
    const panel = panels[0];
    const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year);
    const vars = INDICATOR_VARIABLES[panel.indicator].filter((v) => v.numeric);
    return vars.map((v) => ({ name: v.label, value: getNumericValue(record?.[v.key]) ?? 0 }));
  }

  return panels.map((panel) => {
    const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year);
    const key = variableKey === "__composite__" ? (panel.indicator === "ETTI" ? "etti" : "gtbi") : variableKey;
    return {
      name: `${panel.countryName} ${panel.year}`,
      value: getNumericValue(record?.[key]) ?? 0,
    };
  });
}

function chartIndicatorLabel(panels) {
  const set = new Set(panels.map((p) => p.indicator));
  if (set.size === 1) return [...set][0];
  return "mixed";
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
 * indicator tabs) that a new chart can be built from. charts created here
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
  const [saveStatus, setSaveStatus] = useState({}); // chartId -> "saving"|"saved"|"error"
  const chartViewRef = useRef(null);

  const indicatorOfSelection = chartablePanels.length > 0 ? chartIndicatorLabel(chartablePanels) : null;

  const variableOptions = useMemo(() => {
    if (chartablePanels.length === 0) return [];
    if (indicatorOfSelection === "mixed") {
      return [{ key: "__composite__", label: "Composite Score (ETTI / GTBI)" }];
    }
    const opts = INDICATOR_VARIABLES[indicatorOfSelection].filter((v) => v.numeric).map((v) => ({ key: v.key, label: v.label }));
    if (chartablePanels.length === 1) {
      opts.unshift({ key: "__all__", label: "All variables (this panel)" });
    }
    return opts;
  }, [chartablePanels, indicatorOfSelection]);

  const effectiveVariable = variableOptions.some((o) => o.key === variableKey) ? variableKey : variableOptions[0]?.key || "";

  function handleCreateChart() {
    if (chartablePanels.length === 0 || !effectiveVariable) return;
    const data = buildChartData(chartablePanels, countries, effectiveVariable);
    const variableLabel = variableOptions.find((o) => o.key === effectiveVariable)?.label || effectiveVariable;
    const chart = {
      id: chartIdSeq++,
      title: `${variableLabel} — ${chartablePanels.length === 1 ? chartablePanels[0].countryName : `${chartablePanels.length} panels`}`,
      chartType,
      variableKey: effectiveVariable,
      variableLabel,
      indicator: indicatorOfSelection,
      panels: chartablePanels.map((p) => ({ indicator: p.indicator, countryCode: p.countryCode, countryName: p.countryName, year: p.year })),
      data,
    };
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

  return (
    <div className="obs-charts-section">
      <h3 className="obs-section-heading">Charts &amp; Diagrams</h3>

      <div className="obs-chart-builder">
        <span className="obs-chart-builder-count">
          {chartablePanels.length === 0
            ? "Check a data panel above to build a chart."
            : `${chartablePanels.length} panel${chartablePanels.length > 1 ? "s" : ""} selected`}
        </span>

        <select value={chartType} onChange={(e) => setChartType(e.target.value)} disabled={chartablePanels.length === 0}>
          <option value="bar">Bar chart</option>
          <option value="line">Line chart</option>
        </select>

        <select value={effectiveVariable} onChange={(e) => setVariableKey(e.target.value)} disabled={chartablePanels.length === 0}>
          {variableOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="obs-btn obs-btn-primary"
          disabled={chartablePanels.length === 0 || !effectiveVariable}
          onClick={handleCreateChart}
        >
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
              <ChartView chart={activeChart} />
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

export function ChartView({ chart }) {
  const Container = chart.chartType === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <Container data={chart.data} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
        <CartesianGrid stroke="#1D2A3E" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#9FB0C3" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
        <YAxis stroke="#9FB0C3" />
        <Tooltip contentStyle={{ background: "#0E1626", border: "1px solid #1D2A3E", color: "#EAF1F5" }} />
        <Legend />
        {chart.chartType === "line" ? (
          <Line type="monotone" dataKey="value" name={chart.variableLabel} stroke="#4FD9C7" strokeWidth={2} dot={{ r: 3 }} />
        ) : (
          <Bar dataKey="value" name={chart.variableLabel} fill="#4FD9C7" radius={[4, 4, 0, 0]} />
        )}
      </Container>
    </ResponsiveContainer>
  );
}