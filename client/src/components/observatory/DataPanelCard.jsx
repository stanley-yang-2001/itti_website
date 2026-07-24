import { INDICATOR_VARIABLES, getValueOrNull, getNumericValue } from "../../utils/ObservatoryData";

export default function DataPanelCard({ panel, yearRecord, selected, onToggleSelect, onEdit, onRemove, readOnly }) {
  const variables = INDICATOR_VARIABLES[panel.indicator] || [];

  if (readOnly) {
    return (
      <div className="obs-data-panel obs-data-panel--readonly">
        <div className="obs-data-panel-topbar">
          <span className={`obs-indicator-badge obs-indicator-badge--${panel.indicator.toLowerCase()}`}>
            {panel.indicator}
          </span>
        </div>
        <div className="obs-data-panel-body">
          <div className="obs-data-panel-title">
            <span className="obs-data-panel-country">{panel.countryName}</span>
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
        </div>
      </div>
    );
  }

  return (
    <div className="obs-data-panel">
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
          <span className="obs-data-panel-country">{panel.countryName}</span>
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
        <span className="obs-data-panel-edit-hint">Click to edit selection</span>
      </button>
    </div>
  );
}