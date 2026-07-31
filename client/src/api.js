const API_BASE = '/api';

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function fetchWorldData() {
  return getJson('/world-data');
}

export function fetchAllCountries() {
  return getJson('/countries');
}

export function fetchCountry(isoCode) {
  return getJson(`/countries/${isoCode}`);
}

async function sendJson(path, method, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || `Request to ${path} failed`);
  }
  return data;
}

/** title: string, indicator: "ETTI"|"GTBI"|"mixed", config: plain object describing the chart. */
export function saveObservatoryChart(title, indicator, config) {
  return sendJson("/observatory/saved-charts", "POST", { title, indicator, config });
}

export function fetchSavedObservatoryCharts() {
  return sendJson("/observatory/saved-charts", "GET");
}

export function deleteSavedObservatoryChart(chartId) {
  return sendJson(`/observatory/saved-charts/${chartId}`, "DELETE");
}

/** The logged-in user's own uploaded reports, any review_status. */
export function fetchMyReports() {
  return sendJson("/reports/mine", "GET");
}

/** The logged-in user's favorited reports, full report objects. */
export function fetchFavoriteReports() {
  return sendJson("/reports/favorites", "GET");
}

/** Just the id set - cheap for marking stars on a list of report cards. */
export function fetchFavoriteReportIds() {
  return sendJson("/reports/favorites/ids", "GET");
}

export function favoriteReport(reportId) {
  return sendJson(`/reports/${reportId}/favorite`, "POST");
}

export function unfavoriteReport(reportId) {
  return sendJson(`/reports/${reportId}/favorite`, "DELETE");
}