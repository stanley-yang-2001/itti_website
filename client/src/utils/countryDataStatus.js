// Country records from /api/countries look like:
//   { name: "Brazil", ETTI: { "2018": {...}, "2022": {...} }, GTBI: { "2015": {...} } }
// or, when nothing real has been published yet, every year key is the
// literal string "Data Pending" (see server/app.py's docstring). A section
// "has data" if it has at least one year key that isn't that placeholder.
function sectionHasRealData(section) {
  if (!section || typeof section !== 'object') return false;
  return Object.keys(section).some((year) => year !== 'Data Pending');
}

function latestRealYear(section) {
  if (!section || typeof section !== 'object') return null;
  const years = Object.keys(section)
    .filter((year) => year !== 'Data Pending')
    .map((year) => parseInt(year, 10))
    .filter((year) => Number.isFinite(year));
  if (years.length === 0) return null;
  return Math.max(...years);
}

function numericOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Turns the /api/countries payload (keyed by zero-padded ISO numeric code,
 * matching the TopoJSON feature ids the globe already uses) into a lookup
 * of code -> 'etti' | 'gtbi' | 'both'. Codes with neither indicator are
 * simply left out, so callers can fall back to the globe's default color.
 */
export function computeCountryDataStatus(countriesByCode) {
  const status = {};
  if (!countriesByCode) return status;

  for (const [code, record] of Object.entries(countriesByCode)) {
    const hasEtti = sectionHasRealData(record?.ETTI);
    const hasGtbi = sectionHasRealData(record?.GTBI);
    if (hasEtti && hasGtbi) status[code] = 'both';
    else if (hasEtti) status[code] = 'etti';
    else if (hasGtbi) status[code] = 'gtbi';
  }

  return status;
}

/**
 * Lightweight per-country lookup for the globe's hover tooltip: just
 * the most recent real year + score for each index, not the full
 * record. Same "Data Pending" skip logic as computeCountryDataStatus()
 * above and getAvailableYears() in countryData.js.
 */
export function computeCountryQuickStats(countriesByCode) {
  const stats = {};
  if (!countriesByCode) return stats;

  for (const [code, record] of Object.entries(countriesByCode)) {
    const ettiYear = latestRealYear(record?.ETTI);
    const gtbiYear = latestRealYear(record?.GTBI);
    const etti = ettiYear !== null ? { year: ettiYear, score: numericOrNull(record.ETTI[String(ettiYear)]?.etti) } : null;
    const gtbi = gtbiYear !== null ? { year: gtbiYear, score: numericOrNull(record.GTBI[String(gtbiYear)]?.gtbi) } : null;
    if (etti || gtbi) stats[code] = { name: record?.name, etti, gtbi };
  }

  return stats;
}