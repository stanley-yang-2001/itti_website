/**
 * The 10 fixed sections the public Reports page is organized into.
 * Order here is the display/navigation order, and must stay in sync
 * with REPORT_CATEGORIES in server/models/report.py - the server is
 * the source of truth for what's actually a valid category, this is
 * just so the UI (section nav, upload form) doesn't have to fetch it.
 */
export const REPORT_CATEGORIES = [
  'National Trauma Assessment',
  'Truth & Reconciliation Proposal',
  'Conflict Mapping Report',
  'Policy White Paper',
  'Trauma Observatory Dashboard',
  'Institutional Reform Blueprint',
  'Research Publication',
  'Documentary/Media Project',
  'School Mental Health Model',
  'Refugee Intervention Framework',
];

export const DEFAULT_REPORT_CATEGORY = REPORT_CATEGORIES[0];