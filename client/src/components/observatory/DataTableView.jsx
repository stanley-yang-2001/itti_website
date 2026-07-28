import { useMemo, useState } from "react";
import { INDICATOR_VARIABLES, getYearRecord, getNumericValue, getValueOrNull } from "../../utils/ObservatoryData";
import { downloadCsv, formatNumber } from "../../utils/statsHelpers";
import { colorForCountry } from "../../utils/countryColors";

export default function DataTableView({ chartablePanels, countries }) {
  const [sortKey, setSortKey] = useState("countryName");
  const [sortDir, setSortDir] = useState("asc");

  const indicatorSet = new Set(chartablePanels.map((p) => p.indicator));
  const mixed = indicatorSet.size > 1;

  // In mixed mode there's no shared column set (ETTI and GTBI have
  // different fields), so fall back to just the composite score per row.
  const columns = useMemo(() => {
    if (mixed) return [{ key: "__composite__", label: "Composite Score" }];
    const indicator = [...indicatorSet][0];
    if (!indicator) return [];
    return INDICATOR_VARIABLES[indicator].map((v) => ({ key: v.key, label: v.label, numeric: v.numeric }));
  }, [mixed, indicatorSet]);

  const rows = useMemo(() => {
    return chartablePanels.map((panel) => {
      const record = getYearRecord(countries, panel.indicator, panel.countryCode, panel.year) || {};
      const row = { countryName: panel.countryName, countryCode: panel.countryCode, year: panel.year, indicator: panel.indicator };
      if (mixed) {
        const compositeKey = panel.indicator === "ETTI" ? "etti" : "gtbi";
        row.__composite__ = getNumericValue(record[compositeKey]);
      } else {
        columns.forEach((col) => {
          row[col.key] = col.numeric ? getNumericValue(record[col.key]) : getValueOrNull(record[col.key]);
        });
      }
      return row;
    });
  }, [chartablePanels, countries, mixed, columns]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleExport() {
    const exportRows = sortedRows.map((row) => {
      const flat = { Country: row.countryName, Year: row.year, Indicator: row.indicator };
      columns.forEach((col) => {
        flat[col.label] = row[col.key] === null || row[col.key] === undefined ? "Data Pending" : row[col.key];
      });
      return flat;
    });
    downloadCsv(exportRows, "observatory_data_export");
  }

  if (chartablePanels.length === 0) {
    return <p className="obs-explorer-empty">Check a data panel above to see it here as a table.</p>;
  }

  return (
    <div className="obs-table-view">
      <div className="obs-table-toolbar">
        <span className="obs-chart-builder-count">{chartablePanels.length} row{chartablePanels.length > 1 ? "s" : ""}</span>
        <button type="button" className="obs-btn" onClick={handleExport}>Download CSV</button>
      </div>

      <div className="obs-table-wrap">
        <table className="obs-data-table">
          <thead>
            <tr>
              <SortableHeader label="Country" active={sortKey === "countryName"} dir={sortDir} onClick={() => handleSort("countryName")} />
              <SortableHeader label="Year" active={sortKey === "year"} dir={sortDir} onClick={() => handleSort("year")} />
              <SortableHeader label="Indicator" active={sortKey === "indicator"} dir={sortDir} onClick={() => handleSort("indicator")} />
              {columns.map((col) => (
                <SortableHeader key={col.key} label={col.label} active={sortKey === col.key} dir={sortDir} onClick={() => handleSort(col.key)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr key={i}>
                <td>
                  <span className="obs-country-tag">
                    <span className="obs-country-dot" style={{ background: colorForCountry(row.countryCode) }} />
                    {row.countryName}
                  </span>
                </td>
                <td>{row.year}</td>
                <td>
                  <span className={`obs-indicator-badge obs-indicator-badge--${row.indicator.toLowerCase()}`}>{row.indicator}</span>
                </td>
                {columns.map((col) => (
                  <td key={col.key}>
                    {row[col.key] === null || row[col.key] === undefined
                      ? "Data Pending"
                      : typeof row[col.key] === "number" ? formatNumber(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({ label, active, dir, onClick }) {
  return (
    <th>
      <button type="button" className="obs-table-sort-btn" onClick={onClick}>
        {label}
        {active && <span className="obs-table-sort-arrow">{dir === "asc" ? " ▲" : " ▼"}</span>}
      </button>
    </th>
  );
}