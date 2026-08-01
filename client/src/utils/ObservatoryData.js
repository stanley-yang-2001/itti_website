import { DATA_PENDING, getNumericValue, getValueOrNull } from "./countryData";

/**
 * Static variable catalogs for the two indicators. These mirror the fields
 * data_scripts/etti_extract.py and gtbi_extract.py actually produce per
 * year, so the query tool never invents a field the backend doesn't have.
 *
 * ETTI's four domains (EVS/TIE/PDL/ITS) are each a normalized 0-100
 * composite of their own raw sub-variables (e.g. EVS = deaths +
 * kidnappings + attacks). Both the normalized domain score AND its raw
 * sub-variables are exposed here so a chart can compare, say, death
 * counts specifically across countries - not just the composite. See
 * ETTI_Dashboard_Rationale_and_User_Guide.docx for the authoritative
 * definitions these labels/groups are drawn from.
 */
export const INDICATOR_VARIABLES = {
  ETTI: [
    { key: "etti", label: "ETTI (composite)", numeric: true, group: "Composite" },
    { key: "evs", label: "EVS - Election Violence Severity (normalized)", numeric: true, group: "EVS" },
    { key: "evs_deaths", label: "EVS: Deaths", numeric: true, group: "EVS" },
    { key: "evs_kidnappings", label: "EVS: Kidnappings / forced disappearances", numeric: true, group: "EVS" },
    { key: "evs_attacks", label: "EVS: Attacks / incidents", numeric: true, group: "EVS" },
    { key: "evs_injuries", label: "EVS: Injuries", numeric: true, group: "EVS" },
    { key: "tie", label: "TIE - Threat & Intimidation Environment (normalized)", numeric: true, group: "TIE" },
    { key: "tie_political_intimidation", label: "TIE: Political intimidation", numeric: true, group: "TIE" },
    { key: "tie_threats", label: "TIE: Threats to candidates/press/voters", numeric: true, group: "TIE" },
    { key: "tie_harassment", label: "TIE: Harassment", numeric: true, group: "TIE" },
    { key: "tie_arrests", label: "TIE: Politically-motivated arrests/detentions", numeric: true, group: "TIE" },
    { key: "pdl", label: "PDL - Psychological Distress Load (normalized)", numeric: true, group: "PDL" },
    { key: "pdl_societal_distress", label: "PDL: Societal distress proxy", numeric: true, group: "PDL" },
    { key: "its", label: "ITS - Institutional Trauma Score (normalized)", numeric: true, group: "ITS" },
    { key: "its_protests", label: "ITS: Protests", numeric: true, group: "ITS" },
    { key: "its_security_interventions", label: "ITS: Security interventions", numeric: true, group: "ITS" },
    { key: "its_court_challenges", label: "ITS: Court challenges", numeric: true, group: "ITS" },
    { key: "its_legal_disputes", label: "ITS: Legal disputes", numeric: true, group: "ITS" },
    { key: "election", label: "Election", numeric: false, group: "Context" },
  ],
  GTBI: [
    { key: "gtbi", label: "GTBI (composite)", numeric: true, group: "Composite" },
    { key: "trauma_level", label: "Trauma Level", numeric: false, group: "Composite" },
    { key: "burden_rate", label: "Burden Rate", numeric: true, group: "Burden" },
    { key: "yll", label: "YLL - Years of Life Lost (total)", numeric: true, group: "Burden" },
    { key: "yld", label: "YLD - Years Lived with Disability (total)", numeric: true, group: "Burden" },
    { key: "armed_conflict_yll", label: "Armed Conflict: YLL", numeric: true, group: "Armed Conflict" },
    { key: "armed_conflict_yld", label: "Armed Conflict: YLD", numeric: true, group: "Armed Conflict" },
    { key: "armed_conflict_prevalence", label: "Armed Conflict: Exposed prevalence (%)", numeric: true, group: "Armed Conflict" },
    { key: "political_repression_yll", label: "Political Repression: YLL", numeric: true, group: "Political Repression" },
    { key: "political_repression_yld", label: "Political Repression: YLD", numeric: true, group: "Political Repression" },
    { key: "political_repression_prevalence", label: "Political Repression: Exposed prevalence (%)", numeric: true, group: "Political Repression" },
    { key: "communal_violence_yll", label: "Communal Violence: YLL", numeric: true, group: "Communal Violence" },
    { key: "communal_violence_yld", label: "Communal Violence: YLD", numeric: true, group: "Communal Violence" },
    { key: "communal_violence_prevalence", label: "Communal Violence: Exposed prevalence (%)", numeric: true, group: "Communal Violence" },
    { key: "terrorism_yll", label: "Terrorism: YLL", numeric: true, group: "Terrorism" },
    { key: "terrorism_yld", label: "Terrorism: YLD", numeric: true, group: "Terrorism" },
    { key: "terrorism_prevalence", label: "Terrorism: Exposed prevalence (%)", numeric: true, group: "Terrorism" },
    { key: "forced_displacement_yll", label: "Forced Displacement: YLL", numeric: true, group: "Forced Displacement" },
    { key: "forced_displacement_yld", label: "Forced Displacement: YLD", numeric: true, group: "Forced Displacement" },
    { key: "forced_displacement_prevalence", label: "Forced Displacement: Exposed prevalence (%)", numeric: true, group: "Forced Displacement" },
    { key: "disaster_yll", label: "Disaster (Trauma-Linked): YLL", numeric: true, group: "Disaster" },
    { key: "disaster_yld", label: "Disaster (Trauma-Linked): YLD", numeric: true, group: "Disaster" },
    { key: "disaster_prevalence", label: "Disaster (Trauma-Linked): Exposed prevalence (%)", numeric: true, group: "Disaster" },
    { key: "key_events", label: "Key Events", numeric: false, group: "Context" },
  ],
};

/** GTBI's six exposure-type domains, in display order - used to build the
 *  "GTBI exposure-type breakdown" stacked chart, the GTBI mirror of ETTI's
 *  EVS/TIE/PDL/ITS stacked-domain chart. */
export const GTBI_EXPOSURE_TYPES = [
  { key: "armed_conflict", label: "Armed Conflict", color: "#D14545" },
  { key: "political_repression", label: "Political Repression", color: "#8B5FBF" },
  { key: "communal_violence", label: "Communal Violence", color: "#C06B3D" },
  { key: "terrorism", label: "Terrorism", color: "#14A38F" },
  { key: "forced_displacement", label: "Forced Displacement", color: "#4A78C2" },
  { key: "disaster", label: "Disaster (Trauma-Linked)", color: "#C9932A" },
];

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
 * The composite score (etti/gtbi) is the natural default to chart, but a
 * given indicator's composite (or any specific sub-variable) may not be
 * populated for every country/year - e.g. EVS Injuries and ITS Court
 * Challenges/Legal Disputes are "Data Pending" for every row in the
 * current ETTI workbook (see etti_extract.py). This picks the first
 * numeric variable, in preference order, that actually has a real value
 * for at least one of the given years so a demo/default chart never
 * renders as all zeros.
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