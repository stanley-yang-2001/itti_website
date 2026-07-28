import { INDICATOR_VARIABLES, getValueOrNull, getNumericValue } from "../../utils/ObservatoryData";
import { colorForCountry } from "../../utils/countryColors";
import Sparkline from "./Sparkline.jsx";

function CountryTag({ countryCode, countryName }) {
  const color = colorForCountry(countryCode);
  return (
    <span className="obs-country-tag">
      <span className="obs-country-dot" style={{ background: color }} aria-hidden="true" />
      <span className="obs-data-panel-country">{countryName}</span>
    </span>
  );
}

export default function DataPanelCard({ panel, yearRecord, selected, onToggleSelect, onEdit, onRemove, readOnly, trendValues }) {
  const variables = INDICATOR_VARIABLES[panel.indicator] || [];
  const color = colorForCountry(panel.countryCode);
  const cardStyle = { borderLeft: `4px solid ${color}` };

  const trend = trendValues && trendValues.length >= 2 ? (
    <div className="obs-data-panel-trend">
      <span className="obs-data-panel-trend-label">Trend</span>
      <Sparkline points={trendValues} color={color} />
    </div>
  ) : null;

  if (readOnly) {
    return (
      <div className="obs-data-panel obs-data-panel--readonly" style={cardStyle}>
        <div className="obs-data-panel-topbar">
          <span className={`obs-indicator-badge obs-indicator-badge--${panel.indicator.toLowerCase()}`}>
            {panel.indicator}
          </span>
        </div>
        <div className="obs-data-panel-body">
          <div className="obs-data-panel-title">
            <CountryTag countryCode={panel.countryCode} countryName={panel.countryName} />
            <span className="obs-data-panel-year">{panel.year}</span>
          </div>
          <dl className="obs-data-panel-values">
            {variables.map((v) => {
              const raw = yearRecord ? yearRecord[v.key] : undefined;
              const display = v.numeric
                ? getNumericValue(raw) ?? "Data Pending"
                : getValueOrNull(raw) ?? "Data Pending";
              return (
                <div key={v.key} className="obs-data-panel-value-row">
                  <dt>{v.label}</dt>
                  <dd>{display}</dd>
                </div>
              );
            })}
          </dl>
          {trend}
        </div>
      </div>
    );
  }

  return (
    <div className="obs-data-panel" style={cardStyle}>
      <div className="obs-data-panel-topbar">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${panel.countryName} ${panel.year} for charting`}
        />
        <span className={`obs-indicator-badge obs-indicator-badge--${panel.indicator.toLowerCase()}`}>
          {panel.indicator}
        </span>
        <button
          type="button"
          className="obs-data-panel-remove"
          onClick={onRemove}
          aria-label={`Remove ${panel.countryName} ${panel.year}`}
          title="Remove data panel"
        >
          ✕
        </button>
      </div>

      <button type="button" className="obs-data-panel-body" onClick={onEdit}>
        <div className="obs-data-panel-title">
          <CountryTag countryCode={panel.countryCode} countryName={panel.countryName} />
          <span className="obs-data-panel-year">{panel.year}</span>
        </div>
        <dl className="obs-data-panel-values">
          {variables.map((v) => {
            const raw = yearRecord ? yearRecord[v.key] : undefined;
            const display = v.numeric
              ? getNumericValue(raw) ?? "Data Pending"
              : getValueOrNull(raw) ?? "Data Pending";
            return (
              <div key={v.key} className="obs-data-panel-value-row">
                <dt>{v.label}</dt>
                <dd>{display}</dd>
              </div>
            );
          })}
        </dl>
        {trend}
        <span className="obs-data-panel-edit-hint">Click to edit selection</span>
      </button>
    </div>
  );
}