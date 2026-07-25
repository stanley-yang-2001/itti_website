// Country records from /api/countries look like:
//   { name: "Brazil", ETTI: { "2018": {...}, "2022": {...} }, GTBI: { "2015": {...} } }
// or, when nothing real has been published yet, every year key is the
// literal string "Data Pending" (see server/app.py's docstring). A section
// "has data" if it has at least one year key that isn't that placeholder.
function sectionHasRealData(section) {
  if (!section || typeof section !== 'object') return false;
  return Object.keys(section).some((year) => year !== 'Data Pending');
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