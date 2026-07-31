/**
 * Shared helpers for reading fields out of /api/countries records.
 *
 * Every ETTI/GTBI field in country_data.json is either a real value
 * (number, or a string like a trauma_level label) or the literal
 * string "Data Pending" when the underlying source data isn't
 * available yet. A country with zero source data at all still has
 * both an "ETTI" and "GTBI" section, but keyed under the single year
 * "Data Pending" instead of a real year - see combine_country_data.py.
 *
 * Never compare, sort, chart, or do math on a raw field value without
 * going through isDataPending()/getNumericValue() first - "Data
 * Pending" is a string, and something like `value < 50` on a string
 * will silently misbehave rather than throw, which is worse than an
 * error because it can look like a plausible number in a chart.
 */

export const DATA_PENDING = "Data Pending";

/** True if a raw field value is the "Data Pending" sentinel. */
export function isDataPending(value) {
  return value === DATA_PENDING;
}

/**
 * Returns the value as a number if it's real numeric data, or null if
 * it's "Data Pending", missing, or not actually a number for some
 * other reason (e.g. a non-numeric field like trauma_level was passed
 * in by mistake). Always check for null before using the result.
 */
export function getNumericValue(value) {
  if (isDataPending(value) || value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/**
 * Returns the value as-is if it's real data, or null if it's
 * "Data Pending"/missing. Use this for non-numeric fields like
 * trauma_level where getNumericValue() doesn't apply.
 */
export function getValueOrNull(value) {
  if (isDataPending(value) || value === undefined || value === null) return null;
  return value;
}

/**
 * Given a year-keyed section like record.GTBI or record.ETTI
 * (e.g. { "2020": {...}, "2024": {...} }, or { "Data Pending": {...} }
 * for a country with no data at all), returns the record for the
 * most recent real year, or null if the only key present is the
 * "Data Pending" placeholder.
 */
export function getLatestYearRecord(yearKeyedSection) {
  if (!yearKeyedSection || typeof yearKeyedSection !== "object") return null;

  const realYears = Object.keys(yearKeyedSection)
    .filter((key) => key !== DATA_PENDING)
    .map((key) => parseInt(key, 10))
    .filter((year) => Number.isFinite(year));

  if (realYears.length === 0) return null;

  const latestYear = Math.max(...realYears);
  return yearKeyedSection[String(latestYear)] ?? null;
}

/**
 * Given a year-keyed section like record.GTBI or record.ETTI, returns
 * the sorted list of real years present (newest first), skipping the
 * "Data Pending" placeholder key. Empty array if the country has no
 * real data for that index at all.
 */
export function getAvailableYears(yearKeyedSection) {
  if (!yearKeyedSection || typeof yearKeyedSection !== "object") return [];

  return Object.keys(yearKeyedSection)
    .filter((key) => key !== DATA_PENDING)
    .map((key) => parseInt(key, 10))
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => b - a);
}

/**
 * Returns the record for a specific year out of a year-keyed section,
 * or null if that year isn't present. Pair with getAvailableYears() so
 * a year dropdown only ever offers years that actually resolve here.
 */
export function getYearRecord(yearKeyedSection, year) {
  if (!yearKeyedSection || typeof yearKeyedSection !== "object" || year == null) return null;
  return yearKeyedSection[String(year)] ?? null;
}

/**
 * Convenience formatter for displaying a field in the UI: returns the
 * real value if present, or the literal string "Data Pending"
 * otherwise (so a component can always render {formatField(value)}
 * without a conditional at the call site).
 */
export function formatField(value) {
  return isDataPending(value) || value === undefined || value === null ? DATA_PENDING : value;
}

/**
 * Whether a country has enough real data to show a profile at all - true
 * if either its ETTI or GTBI section has at least one real (non-"Data
 * Pending") year on file. Countries with neither show the shared
 * "unavailable" message instead of an overview.
 */
export function hasProfile(record) {
  return getLatestYearRecord(record?.GTBI) !== null || getLatestYearRecord(record?.ETTI) !== null;
}