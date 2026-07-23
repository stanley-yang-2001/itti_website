import { DATA_PENDING, getNumericValue, getValueOrNull } from "./countryData";

/**
 * Static variable catalogs for the two indicators. These mirror the fields
 * data_scripts/etti_extract.py and gtbi_extract.py actually produce per
 * year, so the query tool never invents a field the backend doesn't have.
 */
export const INDICATOR_VARIABLES = {
  ETTI: [
    { key: "etti", label: "ETTI (composite)", numeric: true },
    { key: "evs", label: "EVS - Electoral Violence Score", numeric: true },
    { key: "tie", label: "TIE - Trust in Elections", numeric: true },
    { key: "pdl", label: "PDL - Post-election Distrust Level", numeric: true },
    { key: "its", label: "ITS - Institutional Trust Score", numeric: true },
  ],
  GTBI: [
    { key: "gtbi", label: "GTBI (composite)", numeric: true },
    { key: "trauma_level", label: "Trauma Level", numeric: false },
    { key: "burden_rate", label: "Burden Rate", numeric: true },
    { key: "yll", label: "YLL - Years of Life Lost", numeric: true },
    { key: "yld", label: "YLD - Years Lived with Disability", numeric: true },
  ],
};

export function variableLabel(indicator, key) {
  const found = (INDICATOR_VARIABLES[indicator] || []).find((v) => v.key === key);
  return found ? found.label : key;
}

/**
 * Real (non "Data Pending") years on file for a country's given section,
 * sorted ascending.
 */
export function getRealYears(section) {
  if (!section || typeof section !== "object") return [];
  return Object.keys(section)
    .filter((k) => k !== DATA_PENDING)
    .map((k) => parseInt(k, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
}

/**
 * Builds the list the country picker shows for one indicator: only
 * countries that have at least one real year on file for that section,
 * each with its sorted list of available years. Sorted alphabetically.
 */
export function getCountriesWithData(countries, indicator) {
  if (!countries) return [];
  const list = Object.entries(countries)
    .map(([code, record]) => ({
      code,
      name: record?.name || code,
      years: getRealYears(record?.[indicator]),
    }))
    .filter((c) => c.years.length > 0);
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/** A stable id for a (indicator, country, year) data panel. */
export function panelId(indicator, countryCode, year) {
  return `${indicator}:${countryCode}:${year}`;
}

/** Pulls the raw year record for a panel out of the /api/countries payload. */
export function getYearRecord(countries, indicator, countryCode, year) {
  return countries?.[countryCode]?.[indicator]?.[String(year)] || null;
}

/**
 * The composite score (etti/gtbi) is the natural default to chart, but the
 * source workbook for a given indicator may not have it populated yet (as
 * of this writing, ETTI's own composite is "Data Pending" for every
 * country - only TIE and PDL are populated; see etti_extract.py). This
 * picks the first numeric variable, in preference order, that actually has
 * a real value for at least one of the given years so a demo/default chart
 * never renders as all zeros.
 */
export function pickAvailableVariable(indicator, countries, countryCode, years) {
  const numericVars = (INDICATOR_VARIABLES[indicator] || []).filter((v) => v.numeric).map((v) => v.key);
  for (const key of numericVars) {
    const hasReal = years.some((year) => {
      const record = getYearRecord(countries, indicator, countryCode, year);
      return getNumericValue(record?.[key]) !== null;
    });
    if (hasReal) return key;
  }
  return numericVars[0];
}

export { getNumericValue, getValueOrNull };