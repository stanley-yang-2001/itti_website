import { useState } from "react";
import CountryPicker from "./CountryPicker.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import EditPanelModal from "./EditPanelModal.jsx";
import DataPanelCard from "./DataPanelCard.jsx";
import { getCountriesWithData, getYearRecord } from "../../utils/ObservatoryData";

export default function DataExplorerPanel({ indicator, countries, panels, onAddPanels, onTogglePanelSelect, onEditPanel, onRemovePanel, onSelectAll }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

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

  return (
    <div className="obs-explorer-panel">
      <div className="obs-explorer-toolbar">
        <button type="button" className="obs-btn obs-btn-primary" onClick={() => setPickerOpen(true)}>
          + Select Data
        </button>
        {indicatorPanels.length > 0 && (
          <button type="button" className="obs-btn" onClick={() => onSelectAll(indicator, !allSelected)}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
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
    </div>
  );
}