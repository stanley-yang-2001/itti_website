import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { fetchWorldData } from "../../api.js";
import { INDICATOR_VARIABLES, getCountriesWithData, getYearRecord, getNumericValue } from "../../utils/ObservatoryData";
import { formatNumber } from "../../utils/statsHelpers";

const MUTED_FILL = "#1B2434";

/**
 * A flat (non-globe) choropleth: one snapshot year + one variable at a
 * time, every country with data for that indicator colored by value.
 * Deliberately decoupled from the data-panel selection above it - a map
 * wants "every country, one year," not an arbitrary set of country/year
 * panels, so it gets its own year/variable pickers instead of reusing
 * chartablePanels.
 */
export default function WorldMapView({ indicator, countries }) {
  const [worldData, setWorldData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const svgRef = useRef(null);

  const countriesWithData = useMemo(() => getCountriesWithData(countries, indicator), [countries, indicator]);
  const allYears = useMemo(() => {
    const years = new Set();
    countriesWithData.forEach((c) => c.years.forEach((y) => years.add(y)));
    return [...years].sort((a, b) => a - b);
  }, [countriesWithData]);

  const numericVars = INDICATOR_VARIABLES[indicator].filter((v) => v.numeric);
  const [year, setYear] = useState(null);
  const [variableKey, setVariableKey] = useState(numericVars[0]?.key || "");

  useEffect(() => {
    if (allYears.length > 0 && (year === null || !allYears.includes(year))) {
      setYear(allYears[allYears.length - 1]);
    }
  }, [allYears, year]);

  useEffect(() => {
    let cancelled = false;
    fetchWorldData()
      .then((data) => { if (!cancelled) setWorldData(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const valuesByCode = useMemo(() => {
    if (year === null) return {};
    const map = {};
    countriesWithData.forEach((c) => {
      const record = getYearRecord(countries, indicator, c.code, year);
      const value = getNumericValue(record?.[variableKey]);
      if (value !== null) map[c.code] = value;
    });
    return map;
  }, [countriesWithData, countries, indicator, year, variableKey]);

  const [minValue, maxValue] = useMemo(() => {
    const values = Object.values(valuesByCode);
    if (values.length === 0) return [0, 1];
    return [Math.min(...values), Math.max(...values)];
  }, [valuesByCode]);

  const colorScale = useMemo(
    () => d3.scaleSequential(d3.interpolateTurbo).domain([minValue, maxValue === minValue ? minValue + 1 : maxValue]),
    [minValue, maxValue]
  );

  useEffect(() => {
    if (!worldData || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 960;
    const height = 480;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const featureCollection = topojson.feature(worldData, worldData.objects.countries);
    const projection = d3.geoNaturalEarth1().fitSize([width, height], featureCollection);
    const path = d3.geoPath(projection);

    svg.append("g")
      .selectAll("path")
      .data(featureCollection.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const code = String(d.id).padStart(3, "0");
        const value = valuesByCode[code];
        return value === undefined ? MUTED_FILL : colorScale(value);
      })
      .attr("stroke", "#080D16")
      .attr("stroke-width", 0.5)
      .append("title")
      .text((d) => {
        const code = String(d.id).padStart(3, "0");
        const name = countries?.[code]?.name || "Unknown";
        const value = valuesByCode[code];
        return value === undefined ? `${name}: Data Pending` : `${name}: ${formatNumber(value)}`;
      });
  }, [worldData, valuesByCode, colorScale, countries]);

  return (
    <div className="obs-map-view">
      <div className="obs-map-controls">
        <label>
          Year
          <select value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))}>
            {allYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Variable
          <select value={variableKey} onChange={(e) => setVariableKey(e.target.value)}>
            {numericVars.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loadError && <p className="obs-explorer-empty">Couldn't load map data: {loadError}</p>}
      {!loadError && !worldData && <p className="obs-explorer-empty">Loading map…</p>}

      {!loadError && worldData && (
        <>
          <svg ref={svgRef} className="obs-map-svg" />
          <div className="obs-map-legend">
            <span>{formatNumber(minValue)}</span>
            <div className="obs-map-legend-gradient" />
            <span>{formatNumber(maxValue)}</span>
            <span className="obs-map-legend-muted"><span className="obs-map-legend-swatch" /> No data</span>
          </div>
        </>
      )}
    </div>
  );
}