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

export function fetchSavedObservatoryChart(chartId) {
  return sendJson(`/observatory/saved-charts/${chartId}`, "GET");
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

/**
 * search/limit/offset all optional. Unlike the other list endpoints
 * above, this one's total count lives in a response header
 * (X-Total-Count) rather than the body, so it can't reuse getJson -
 * the Access Level panel needs that total to render "Page X of Y" /
 * disable Next past the last page.
 */
export async function fetchAdminUsers({ search = "", limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set("search", search);

  const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || "Request to /admin/users failed");
  }
  return { users: data, total: Number(res.headers.get("X-Total-Count")) || 0 };
}

/** changes: [{ user_id, role }, ...]. Returns the updated User objects. */
export function updateUserRoles(changes) {
  return sendJson("/admin/users/roles", "POST", { changes });
}

/**
 * Admin-only: every report regardless of review_status or hidden
 * status, for the Control tab's recategorize tool. Same
 * header-based-total shape as fetchAdminUsers above, for the same
 * reason (pagination needs a total independent of the page body).
 */
export async function fetchAllReportsAdmin({ search = "", category = "", limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const res = await fetch(`${API_BASE}/reports/all?${params.toString()}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || "Request to /reports/all failed");
  }
  return { reports: data, total: Number(res.headers.get("X-Total-Count")) || 0 };
}

/** Admin-only: updates just a report's category. Returns the updated report. */
export function updateReportCategory(reportId, category) {
  return sendJson(`/reports/${reportId}/category`, "PATCH", { category });
}

/**
 * A publisher/admin requesting to delete their own PUBLISHED report -
 * starts the reviewer-approval watching period rather than deleting
 * outright (see docs/ACCESS_LEVELS.md's "Report deletion" section).
 * Returns the updated report (review_status becomes
 * "deletion_requested").
 */
export function requestReportDeletion(reportId, reason) {
  return sendJson(`/reports/${reportId}/request-deletion`, "POST", { reason });
}

/**
 * Reviewer/admin-only: decides a pending deletion request. decision is
 * "approve" or "deny" - a single decision is final immediately, unlike
 * the vote-counted publish workflow. Returns the updated report.
 */
export function reviewDeletionRequest(reportId, decision) {
  return sendJson(`/reports/${reportId}/deletion-review`, "POST", { decision });
}

/** Reviewer/admin-only: reports currently awaiting a deletion decision, oldest request first. */
export async function fetchDeletionRequestedReports({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/reports/deletion-requests?${params.toString()}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || "Request to /reports/deletion-requests failed");
  }
  return { reports: data, total: Number(res.headers.get("X-Total-Count")) || 0 };
}

/**
 * Admin-only: every soft-deleted report that was published at some
 * point, for the Deleted Reports page. Same shape as
 * fetchAllReportsAdmin above.
 */
export async function fetchDeletedReportsAdmin({ search = "", category = "", limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const res = await fetch(`${API_BASE}/reports/deleted?${params.toString()}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.description || data.error || "Request to /reports/deleted failed");
  }
  return { reports: data, total: Number(res.headers.get("X-Total-Count")) || 0 };
}

/** Admin-only: un-deletes a report from the Deleted Reports page - restores visibility, nothing else changes. */
export function repostReport(reportId) {
  return sendJson(`/reports/${reportId}/repost`, "POST", {});
}

/** Admin-only: permanently removes a report and its files. Irreversible. */
export function hardDeleteReport(reportId) {
  return sendJson(`/reports/${reportId}/permanent`, "DELETE");
}