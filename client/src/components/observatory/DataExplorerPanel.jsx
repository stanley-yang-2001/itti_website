import { useState } from "react";
import CountryPicker from "./CountryPicker.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import EditPanelModal from "./EditPanelModal.jsx";
import DataPanelCard from "./DataPanelCard.jsx";
import { getCountriesWithData, getYearRecord, getRealYears, getNumericValue } from "../../utils/ObservatoryData";
import { ETTI_INTERPRETATION_SHORT, GTBI_INTERPRETATION_SHORT } from "../../data/observatoryReferences.js";

const INTERPRETATION_TEXT = { ETTI: ETTI_INTERPRETATION_SHORT, GTBI: GTBI_INTERPRETATION_SHORT };
const TREND_VARIABLE = { ETTI: "etti", GTBI: "gtbi" };

function InterpretationBlurb({ indicator }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="obs-interpretation-wrap">
      <p className={`obs-interpretation${expanded ? "" : " obs-interpretation--clamped"}`}>
        {INTERPRETATION_TEXT[indicator]}
      </p>
      <button type="button" className="obs-interpretation-toggle" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

export default function DataExplorerPanel({ indicator, countries, panels, onAddPanels, onTogglePanelSelect, onEditPanel, onRemovePanel, onSelectAll, onSelectAllData }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [showTrend, setShowTrend] = useState(false);
  const [confirmSelectAllData, setConfirmSelectAllData] = useState(false);

  const countriesWithData = getCountriesWithData(countries, indicator);
  const indicatorPanels = panels.filter((p) => p.indicator === indicator);
  const existingKeys = new Set(indicatorPanels.map((p) => `${p.countryCode}:${p.year}`));

  const editingPanel = indicatorPanels.find((p) => p.id === editingId) || null;
  const removingPanel = indicatorPanels.find((p) => p.id === removingId) || null;

  const allSelected = indicatorPanels.length > 0 && indicatorPanels.every((p) => p.selected);

  function handleConfirmSelections(selections) {
    onAddPanels(indicator, selections, countriesWithData);
    setPickerOpen(false);
  }

  /** Full trend for a country across every real year on file for it (not
   * just its currently-selected years) - the point of a sparkline is
   * showing the whole trajectory, not just what happens to be selected. */
  function trendForPanel(panel) {
    const record = countries?.[panel.countryCode];
    const years = getRealYears(record?.[indicator]);
    if (years.length < 2) return null;
    const variable = TREND_VARIABLE[indicator];
    return years.map((year) => getNumericValue(getYearRecord(countries, indicator, panel.countryCode, year)?.[variable]));
  }

  return (
    <div className="obs-explorer-panel">
      <InterpretationBlurb indicator={indicator} />

      <div className="obs-explorer-toolbar">
        <button type="button" className="obs-btn obs-btn-primary" onClick={() => setPickerOpen(true)}>
          + Select Data
        </button>
        <button type="button" className="obs-btn" onClick={() => setConfirmSelectAllData(true)}>
          Select all data (GTBI + ETTI)
        </button>
        {indicatorPanels.length > 0 && (
          <button type="button" className="obs-btn" onClick={() => onSelectAll(indicator, !allSelected)}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
        {indicatorPanels.length > 0 && (
          <label className="obs-split-toggle">
            <input type="checkbox" checked={showTrend} onChange={(e) => setShowTrend(e.target.checked)} />
            Show trend
          </label>
        )}
        <span className="obs-explorer-count">{indicatorPanels.length} data panel{indicatorPanels.length === 1 ? "" : "s"}</span>
      </div>

      {indicatorPanels.length === 0 ? (
        <p className="obs-explorer-empty">
          No {indicator} data panels yet. Click "Select Data" to pick a country and year to explore.
        </p>
      ) : (
        <div className="obs-panel-slideshow">
          {indicatorPanels.map((panel) => (
            <DataPanelCard
              key={panel.id}
              panel={panel}
              yearRecord={getYearRecord(countries, panel.indicator, panel.countryCode, panel.year)}
              selected={panel.selected}
              onToggleSelect={() => onTogglePanelSelect(panel.id)}
              onEdit={() => setEditingId(panel.id)}
              onRemove={() => setRemovingId(panel.id)}
              trendValues={showTrend ? trendForPanel(panel) : null}
            />
          ))}
        </div>
      )}

      {pickerOpen && (
        <CountryPicker
          indicator={indicator}
          countries={countriesWithData}
          existingKeys={existingKeys}
          onConfirm={handleConfirmSelections}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {editingPanel && (
        <EditPanelModal
          panel={editingPanel}
          countries={countriesWithData}
          existingKeys={new Set([...existingKeys].filter((k) => k !== `${editingPanel.countryCode}:${editingPanel.year}`))}
          onSave={(updates) => { onEditPanel(editingPanel.id, updates); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {removingPanel && (
        <ConfirmModal
          title="Remove data panel?"
          message={`This will remove the ${indicator} data panel for ${removingPanel.countryName}, ${removingPanel.year}.`}
          onConfirm={() => { onRemovePanel(removingPanel.id); setRemovingId(null); }}
          onCancel={() => setRemovingId(null)}
        />
      )}

      {confirmSelectAllData && (
        <ConfirmModal
          title="Select all data?"
          message="This adds a data panel for every country and year on file, across both GTBI and ETTI. You can remove individual panels afterward, or use the per-indicator picker for a smaller selection instead."
          confirmLabel="Select all"
          confirmClassName="obs-btn-primary"
          onConfirm={() => { onSelectAllData(); setConfirmSelectAllData(false); }}
          onCancel={() => setConfirmSelectAllData(false)}
        />
      )}
    </div>
  );
}