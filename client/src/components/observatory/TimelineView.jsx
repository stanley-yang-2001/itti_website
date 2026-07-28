import { useMemo, useState } from "react";
import { getRealYears, getYearRecord, getNumericValue, getValueOrNull } from "../../utils/ObservatoryData";
import { colorForCountry } from "../../utils/countryColors";
import { formatNumber } from "../../utils/statsHelpers";

const COMPOSITE_KEY = { ETTI: "etti", GTBI: "gtbi" };
const ANNOTATION_KEY = { ETTI: "election", GTBI: "key_events" };

/**
 * One horizontal track per (country, indicator) pair present in the
 * current selection, sharing a single time axis so every track lines up
 * for comparison. Each marker is a year that country actually has data
 * for (not just the currently-selected years - same "show the whole
 * trend" idea as the data-panel sparklines), sized by how high that
 * year's composite score is, with a bigger/highlighted ring on whichever
 * year(s) are actually selected as data panels right now. Hovering a
 * marker surfaces the field this UI otherwise never shows: GTBI's
 * "Key Events" text, or ETTI's election label.
 */
export default function TimelineView({ chartablePanels, countries }) {
  const [hovered, setHovered] = useState(null);

  const tracks = useMemo(() => {
    const seen = new Map(); // `${code}:${indicator}` -> track
    chartablePanels.forEach((panel) => {
      const key = `${panel.countryCode}:${panel.indicator}`;
      if (seen.has(key)) return;
      const record = countries?.[panel.countryCode];
      const years = getRealYears(record?.[panel.indicator]);
      if (years.length === 0) return;
      seen.set(key, {
        key,
        countryCode: panel.countryCode,
        countryName: panel.countryName,
        indicator: panel.indicator,
        color: colorForCountry(panel.countryCode),
        years,
        selectedYears: new Set(chartablePanels.filter((p) => p.countryCode === panel.countryCode && p.indicator === panel.indicator).map((p) => p.year)),
      });
    });
    return [...seen.values()];
  }, [chartablePanels, countries]);

  const [minYear, maxYear] = useMemo(() => {
    const allYears = tracks.flatMap((t) => t.years);
    if (allYears.length === 0) return [2015, 2025];
    return [Math.min(...allYears), Math.max(...allYears)];
  }, [tracks]);

  if (chartablePanels.length === 0) {
    return <p className="obs-explorer-empty">Check a data panel above to see its full timeline here.</p>;
  }
  if (tracks.length === 0) {
    return <p className="obs-explorer-empty">No recorded years to plot for the current selection.</p>;
  }

  const span = Math.max(1, maxYear - minYear);

  return (
    <div className="obs-timeline-view">
      <div className="obs-timeline-axis">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
      {tracks.map((track) => (
        <div key={track.key} className="obs-timeline-track">
          <div className="obs-timeline-track-label">
            <span className="obs-country-dot" style={{ background: track.color }} />
            {track.countryName}
            <span className={`obs-indicator-badge obs-indicator-badge--${track.indicator.toLowerCase()}`}>{track.indicator}</span>
          </div>
          <div className="obs-timeline-line">
            {track.years.map((year) => {
              const record = getYearRecord(countries, track.indicator, track.countryCode, year);
              const score = getNumericValue(record?.[COMPOSITE_KEY[track.indicator]]);
              const annotation = getValueOrNull(record?.[ANNOTATION_KEY[track.indicator]]);
              const size = score === null ? 8 : 6 + (score / 100) * 14;
              const isSelected = track.selectedYears.has(year);
              const hoverKey = `${track.key}:${year}`;
              return (
                <div
                  key={year}
                  className={`obs-timeline-marker${isSelected ? " obs-timeline-marker--selected" : ""}`}
                  style={{ left: `${((year - minYear) / span) * 100}%` }}
                  onMouseEnter={() => setHovered(hoverKey)}
                  onMouseLeave={() => setHovered((h) => (h === hoverKey ? null : h))}
                >
                  <span
                    className="obs-timeline-dot"
                    style={{ width: size, height: size, background: track.color }}
                  />
                  <span className="obs-timeline-year">{year}</span>
                  {hovered === hoverKey && (
                    <div className="obs-timeline-tooltip">
                      <strong>{track.countryName} {year}</strong>
                      <div>{track.indicator}: {score === null ? "Data Pending" : formatNumber(score)}</div>
                      {annotation && <div className="obs-timeline-tooltip-annotation">{annotation}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}