import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataPanelCard from "./DataPanelCard.jsx";
import { ChartView } from "./ChartsSection.jsx";
import {
  INDICATOR_VARIABLES, GTBI_EXPOSURE_TYPES, getRealYears, getYearRecord, getNumericValue, pickAvailableVariable,
} from "../../utils/ObservatoryData";
import { colorForCountry } from "../../utils/countryColors";
import { NTO_MAP_AUTHOR, NTO_MAP_PUBLISHED_DATE, NTO_MAP_CAPTION, NTO_MAP_CITATION_SHORT } from "../../data/observatoryReferences.js";

const NIGERIA_CODE = "566";

/** Nigeria's own trend over time - one colored line for Nigeria across its recorded years. */
function trendChart(indicator, countryCode, countryName, years, countries, variableKey) {
  const color = colorForCountry(countryCode);
  const data = years.map((year) => {
    const record = getYearRecord(countries, indicator, countryCode, year);
    return { year: String(year), [countryCode]: getNumericValue(record?.[variableKey]) ?? 0 };
  });
  const varMeta = INDICATOR_VARIABLES[indicator].find((v) => v.key === variableKey);
  return {
    title: `${countryName} — ${varMeta.label} over time`,
    chartType: "line",
    variableLabel: varMeta.label,
    data,
    seriesKeys: [{ key: countryCode, name: countryName, color }],
    xKey: "year",
  };
}

/** GTBI's Burden Rate over time for Nigeria - a second trend beyond the composite score. */
function burdenRateTrendChart(countryCode, countryName, years, countries) {
  const color = colorForCountry(`${countryCode}:burden_rate`);
  const data = years.map((year) => {
    const record = getYearRecord(countries, "GTBI", countryCode, year);
    return { year: String(year), [countryCode]: getNumericValue(record?.burden_rate) ?? 0 };
  });
  return {
    title: `${countryName} — Burden Rate over time`,
    chartType: "line",
    variableLabel: "Burden Rate",
    data,
    seriesKeys: [{ key: countryCode, name: countryName, color }],
    xKey: "year",
  };
}

/** YLL vs. YLD as two lines over time - the two components underlying Burden Rate/GTBI. */
function yllYldTrendChart(countryCode, countryName, years, countries) {
  const yllColor = colorForCountry(`${countryCode}:yll`);
  const yldColor = colorForCountry(`${countryCode}:yld`);
  const data = years.map((year) => {
    const record = getYearRecord(countries, "GTBI", countryCode, year);
    return {
      year: String(year),
      yll: getNumericValue(record?.yll) ?? 0,
      yld: getNumericValue(record?.yld) ?? 0,
    };
  });
  return {
    title: `${countryName} — YLL vs. YLD over time`,
    chartType: "line",
    variableLabel: "Years (YLL / YLD)",
    data,
    seriesKeys: [
      { key: "yll", name: "YLL — Years of Life Lost", color: yllColor },
      { key: "yld", name: "YLD — Years Lived with Disability", color: yldColor },
    ],
    xKey: "year",
  };
}

/** Nigeria vs. every other country with data - one bar per country, colored per country. */
function comparisonChart(indicator, variableKey, countriesWithData, countries, highlightCode) {
  const varMeta = INDICATOR_VARIABLES[indicator].find((v) => v.key === variableKey);
  const data = countriesWithData.map(({ code, name, years }) => {
    const latestYear = years[years.length - 1];
    const record = getYearRecord(countries, indicator, code, latestYear);
    return {
      name: code === highlightCode ? `${name} ★` : name,
      value: getNumericValue(record?.[variableKey]) ?? 0,
      color: colorForCountry(code),
    };
  });
  return {
    title: `${varMeta.label} — Nigeria vs. other countries (latest year each)`,
    chartType: "bar",
    variableLabel: varMeta.label,
    data,
    seriesKeys: countriesWithData.map(({ code, name }) => ({ key: code, name, color: colorForCountry(code) })),
    xKey: "name",
  };
}

/** ETTI's four domains (EVS/TIE/PDL/ITS), stacked per year Nigeria has an ETTI record. */
function ettiDomainBreakdownChart(countryCode, countryName, years, countries) {
  const data = years.map((year) => {
    const record = getYearRecord(countries, "ETTI", countryCode, year);
    return {
      name: String(year),
      evs: getNumericValue(record?.evs) ?? 0,
      tie: getNumericValue(record?.tie) ?? 0,
      pdl: getNumericValue(record?.pdl) ?? 0,
      its: getNumericValue(record?.its) ?? 0,
    };
  });
  return { title: `${countryName} — ETTI domain breakdown by election year`, chartType: "stackedDomain", data, xKey: "name" };
}

/** GTBI's six exposure types, stacked by YLL per year Nigeria has a GTBI record. */
function gtbiExposureBreakdownChart(countryCode, countryName, years, countries) {
  const data = years.map((year) => {
    const record = getYearRecord(countries, "GTBI", countryCode, year);
    const row = { name: String(year) };
    GTBI_EXPOSURE_TYPES.forEach((t) => {
      row[t.key] = getNumericValue(record?.[`${t.key}_yll`]) ?? 0;
    });
    return row;
  });
  return { title: `${countryName} — GTBI exposure-type YLL breakdown by year`, chartType: "stackedExposure", data, xKey: "name" };
}

const CHART_GROUPS = [
  { key: "trends", label: "Trends" },
  { key: "comparisons", label: "Comparisons" },
  { key: "breakdowns", label: "Breakdowns" },
];

/**
 * Reference implementation of the Observatory's functionality, fixed to
 * Nigeria: the geographic stressor severity map, every year on file for
 * Nigeria (both ETTI and GTBI) as static data panels, and a set of
 * pre-built charts organized into Trends / Comparisons / Breakdowns so
 * they're easier to navigate than one long undifferentiated list.
 * Purely illustrative - the interactive query tool lives under the
 * "International Trauma Observatory" tab.
 */
export default function NigeriaObservatory({ countries }) {
  const [chartGroup, setChartGroup] = useState("trends");
  const nigeriaRecord = countries?.[NIGERIA_CODE];
  const nigeriaName = nigeriaRecord?.name || "Nigeria";

  const ettiYears = useMemo(() => getRealYears(nigeriaRecord?.ETTI), [nigeriaRecord]);
  const gtbiYears = useMemo(() => getRealYears(nigeriaRecord?.GTBI), [nigeriaRecord]);

  const countriesWithEtti = useMemo(() => {
    if (!countries) return [];
    return Object.entries(countries)
      .map(([code, r]) => ({ code, name: r.name, years: getRealYears(r.ETTI) }))
      .filter((c) => c.years.length > 0);
  }, [countries]);

  const countriesWithGtbi = useMemo(() => {
    if (!countries) return [];
    return Object.entries(countries)
      .map(([code, r]) => ({ code, name: r.name, years: getRealYears(r.GTBI) }))
      .filter((c) => c.years.length > 0);
  }, [countries]);

  if (!nigeriaRecord) {
    return <p className="obs-explorer-empty">Loading Nigeria's data…</p>;
  }

  const ettiTrend = ettiYears.length > 0
    ? trendChart("ETTI", NIGERIA_CODE, nigeriaName, ettiYears, countries, pickAvailableVariable("ETTI", countries, NIGERIA_CODE, ettiYears))
    : null;
  const gtbiTrend = gtbiYears.length > 0
    ? trendChart("GTBI", NIGERIA_CODE, nigeriaName, gtbiYears, countries, pickAvailableVariable("GTBI", countries, NIGERIA_CODE, gtbiYears))
    : null;
  const burdenRateTrend = gtbiYears.length > 0 ? burdenRateTrendChart(NIGERIA_CODE, nigeriaName, gtbiYears, countries) : null;
  const yllYldTrend = gtbiYears.length > 0 ? yllYldTrendChart(NIGERIA_CODE, nigeriaName, gtbiYears, countries) : null;

  const ettiComparison = countriesWithEtti.length > 0
    ? comparisonChart("ETTI", pickAvailableVariable("ETTI", countries, NIGERIA_CODE, ettiYears), countriesWithEtti, countries, NIGERIA_CODE)
    : null;
  const gtbiComparison = countriesWithGtbi.length > 0
    ? comparisonChart("GTBI", pickAvailableVariable("GTBI", countries, NIGERIA_CODE, gtbiYears), countriesWithGtbi, countries, NIGERIA_CODE)
    : null;

  const ettiDomainBreakdown = ettiYears.length > 0 ? ettiDomainBreakdownChart(NIGERIA_CODE, nigeriaName, ettiYears, countries) : null;
  const gtbiExposureBreakdown = gtbiYears.length > 0 ? gtbiExposureBreakdownChart(NIGERIA_CODE, nigeriaName, gtbiYears, countries) : null;

  const chartsByGroup = {
    trends: [ettiTrend, gtbiTrend, burdenRateTrend, yllYldTrend].filter(Boolean),
    comparisons: [ettiComparison, gtbiComparison].filter(Boolean),
    breakdowns: [ettiDomainBreakdown, gtbiExposureBreakdown].filter(Boolean),
  };
  const visibleCharts = chartsByGroup[chartGroup];

  return (
    <div className="obs-nigeria-page">
      <p className="obs-nigeria-intro">
        A worked example of the Observatory: every recorded ETTI and GTBI year for {nigeriaName}, its trend over
        time, and how it compares to every other country with data on file. The interactive version of this same
        tool — for any country, any year, any variable — lives under the "International Trauma Observatory" tab.
      </p>

      <h3 className="obs-section-heading">Geographic stressor severity map</h3>
      <div className="obs-nto-map">
        <img
          src="/images/nigeria-stressor-severity-map.png"
          alt="Nigeria Trauma Observatory geographic stressor severity map (2020-2026), rating each of Nigeria's six geopolitical zones by severity and dominant stressor type"
          className="obs-nto-map-img"
        />
        <p className="obs-nto-map-caption">{NTO_MAP_CAPTION}</p>
        <p className="obs-nto-map-meta">
          Source: <Link to="/docs#nto-map">{NTO_MAP_CITATION_SHORT}</Link> · Map by {NTO_MAP_AUTHOR} · Published {NTO_MAP_PUBLISHED_DATE}
        </p>
      </div>

      <h3 className="obs-section-heading">ETTI data panels — {nigeriaName}</h3>
      {ettiYears.length === 0 ? (
        <p className="obs-explorer-empty">No ETTI years on file for {nigeriaName} yet.</p>
      ) : (
        <div className="obs-panel-slideshow">
          {ettiYears.map((year) => (
            <DataPanelCard
              key={year}
              readOnly
              panel={{ indicator: "ETTI", countryCode: NIGERIA_CODE, countryName: nigeriaName, year }}
              yearRecord={getYearRecord(countries, "ETTI", NIGERIA_CODE, year)}
            />
          ))}
        </div>
      )}

      <h3 className="obs-section-heading">GTBI data panels — {nigeriaName}</h3>
      {gtbiYears.length === 0 ? (
        <p className="obs-explorer-empty">No GTBI years on file for {nigeriaName} yet.</p>
      ) : (
        <div className="obs-panel-slideshow">
          {gtbiYears.map((year) => (
            <DataPanelCard
              key={year}
              readOnly
              panel={{ indicator: "GTBI", countryCode: NIGERIA_CODE, countryName: nigeriaName, year }}
              yearRecord={getYearRecord(countries, "GTBI", NIGERIA_CODE, year)}
            />
          ))}
        </div>
      )}

      <h3 className="obs-section-heading">Charts</h3>
      <p className="obs-nigeria-chart-note">
        Charts use each indicator's composite score where it's available; if the composite isn't populated yet for
        the current data, the next most informative variable is shown instead. Each country keeps the same color
        everywhere on this page. Use the tabs below to jump between trend lines, cross-country comparisons, and
        domain/exposure-type breakdowns instead of scrolling through all of them at once.
      </p>

      <div className="obs-indicator-tabs" role="tablist">
        {CHART_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={chartGroup === g.key}
            className={`obs-indicator-tab${chartGroup === g.key ? " active" : ""}`}
            onClick={() => setChartGroup(g.key)}
          >
            {g.label} ({chartsByGroup[g.key].length})
          </button>
        ))}
      </div>

      {visibleCharts.length === 0 ? (
        <p className="obs-explorer-empty">No charts available for this group yet.</p>
      ) : (
        <div className="obs-nigeria-charts">
          {visibleCharts.map((chart) => (
            <div key={chart.title} className="obs-chart-card">
              <h4>{chart.title}</h4>
              <div className="obs-chart-view"><ChartView chart={chart} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}