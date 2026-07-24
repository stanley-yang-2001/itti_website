import { useMemo } from "react";
import DataPanelCard from "./DataPanelCard.jsx";
import { ChartView } from "./ChartsSection.jsx";
import { INDICATOR_VARIABLES, getRealYears, getYearRecord, getNumericValue, pickAvailableVariable } from "../../utils/ObservatoryData";
import { colorForCountry } from "../../utils/countryColors";

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

/**
 * Reference implementation of the Observatory's functionality, fixed to
 * Nigeria: shows every year on file for Nigeria (both ETTI and GTBI) as
 * static data panels, a trend chart per indicator, and a bar-chart
 * comparison of Nigeria against every other country with data recorded for
 * the same indicator. Purely illustrative - the interactive query tool
 * lives under the "International Trauma Observatory" tab.
 */
export default function NigeriaObservatory({ countries }) {
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
  const ettiComparison = countriesWithEtti.length > 0
    ? comparisonChart("ETTI", pickAvailableVariable("ETTI", countries, NIGERIA_CODE, ettiYears), countriesWithEtti, countries, NIGERIA_CODE)
    : null;
  const gtbiComparison = countriesWithGtbi.length > 0
    ? comparisonChart("GTBI", pickAvailableVariable("GTBI", countries, NIGERIA_CODE, gtbiYears), countriesWithGtbi, countries, NIGERIA_CODE)
    : null;

  return (
    <div className="obs-nigeria-page">
      <p className="obs-nigeria-intro">
        A worked example of the Observatory: every recorded ETTI and GTBI year for {nigeriaName}, its trend over
        time, and how it compares to every other country with data on file. The interactive version of this same
        tool — for any country, any year, any variable — lives under the "International Trauma Observatory" tab.
      </p>

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
        everywhere on this page.
      </p>
      <div className="obs-nigeria-charts">
        {ettiTrend && (
          <div className="obs-chart-card">
            <h4>{ettiTrend.title}</h4>
            <div className="obs-chart-view"><ChartView chart={ettiTrend} /></div>
          </div>
        )}
        {gtbiTrend && (
          <div className="obs-chart-card">
            <h4>{gtbiTrend.title}</h4>
            <div className="obs-chart-view"><ChartView chart={gtbiTrend} /></div>
          </div>
        )}
        {ettiComparison && (
          <div className="obs-chart-card">
            <h4>{ettiComparison.title}</h4>
            <div className="obs-chart-view"><ChartView chart={ettiComparison} /></div>
          </div>
        )}
        {gtbiComparison && (
          <div className="obs-chart-card">
            <h4>{gtbiComparison.title}</h4>
            <div className="obs-chart-view"><ChartView chart={gtbiComparison} /></div>
          </div>
        )}
      </div>
    </div>
  );
}