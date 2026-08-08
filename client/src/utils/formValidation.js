/**
 * formValidation.js
 *
 * Centralized input validation for the React frontend. Client-side
 * validation here is purely the fast, friendly UX layer - the SERVER
 * is still the real enforcement (a request can always bypass the
 * browser), this just gives instant feedback without a round trip.
 *
 * HOW TO ADD A NEW CHECK
 * -----------------------
 * 1. Write a function shaped like:
 *
 *      export function checkSomething(value) {
 *        if (<bad condition>) return "A specific, user-safe message.";
 *        return null; // null means "this value is fine"
 *      }
 *
 * 2. Register it in CHECKS below under a short name.
 * 3. Call it from a component:
 *
 *      const error = runCheck('something', value);
 *      if (error) setError(error);
 *
 *    ...or validate several fields at once with validateAll():
 *
 *      const error = validateAll([
 *        ['email', email],
 *        ['password', password],
 *      ]);
 *
 * That's the whole extension surface.
 */

import { REPORT_CATEGORIES } from '../constants/reportCategories.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Letters (any language via \p{L}), digits, spaces, and a conservative
// set of punctuation that legitimately appears in place names
// (apostrophes, hyphens, periods, commas, parentheses). Deliberately
// excludes characters with no business in a place-name search, e.g.
// < > ; % { } \ or control characters.
const SAFE_SEARCH_RE = /^[\p{L}\p{N}\s\-'.,()]+$/u;

export const MAX_SEARCH_QUERY_LENGTH = 100;
export const MAX_NAME_LENGTH = 100;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_REPORT_TITLE_LENGTH = 200;
export const MAX_REPORT_DESCRIPTION_LENGTH = 2000;
export const MIN_DONATION_DOLLARS = 1;
export const MAX_DONATION_DOLLARS = 100000;

export function checkEmail(value) {
  if (!value || !value.trim()) return 'Email is required.';
  if (value.length > 254) return 'Email address is too long.';
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address.';
  return null;
}

export function checkPassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (value.length > MAX_PASSWORD_LENGTH) return `Password must be under ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}

export function checkPasswordsMatch(password, confirmPassword) {
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export function checkName(value) {
  if (value == null || !value.trim()) return 'Name cannot be empty.';
  if (value.length > MAX_NAME_LENGTH) return `Name must be under ${MAX_NAME_LENGTH} characters.`;
  return null;
}

/**
 * Rejects search input containing characters with no legitimate place
 * in a country/place-name search (e.g. someone pasting <script> tags or
 * SQL-injection-style strings into the globe search box). An empty
 * query is not an error - it just means "no filter" - so this only
 * rejects non-empty queries containing disallowed characters.
 */
export function checkSearchQuery(value) {
  if (value == null || value === '') return null;
  if (value.length > MAX_SEARCH_QUERY_LENGTH) return `Search text must be under ${MAX_SEARCH_QUERY_LENGTH} characters.`;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(value)) return "Search text contains characters that aren't allowed.";
  if (!SAFE_SEARCH_RE.test(value)) {
    return "Search text can only contain letters, numbers, spaces, and basic punctuation (' - . , ()).";
  }
  return null;
}

export function checkReportTitle(value) {
  if (value == null || !value.trim()) return 'Title is required.';
  if (value.length > MAX_REPORT_TITLE_LENGTH) return `Title must be under ${MAX_REPORT_TITLE_LENGTH} characters.`;
  return null;
}

export function checkReportDescription(value) {
  if (value == null || !value.trim()) return 'Description is required.';
  if (value.length > MAX_REPORT_DESCRIPTION_LENGTH) {
    return `Description must be under ${MAX_REPORT_DESCRIPTION_LENGTH} characters.`;
  }
  return null;
}

export function checkReportCategory(value) {
  if (value == null || !value.trim()) return 'Section is required.';
  if (!REPORT_CATEGORIES.includes(value)) return 'Not a recognized report section.';
  return null;
}

/** value is a dollar amount (number), e.g. from a preset or parsed custom-amount input. */
export function checkDonationAmount(value) {
  if (value == null || Number.isNaN(value)) return 'Choose an amount or enter a custom one.';
  if (value < MIN_DONATION_DOLLARS) return `Minimum donation is $${MIN_DONATION_DOLLARS.toFixed(2)}.`;
  if (value > MAX_DONATION_DOLLARS) {
    return `Donations over $${MAX_DONATION_DOLLARS.toLocaleString()} aren't supported online — please contact us directly.`;
  }
  return null;
}

const CHECKS = {
  email: checkEmail,
  password: checkPassword,
  name: checkName,
  searchQuery: checkSearchQuery,
  reportTitle: checkReportTitle,
  reportDescription: checkReportDescription,
  reportCategory: checkReportCategory,
  donationAmount: checkDonationAmount,
};

/** Looks up a check by name and runs it. Returns null (valid) or an error message. */
export function runCheck(checkName, value) {
  const checkFn = CHECKS[checkName];
  if (!checkFn) throw new Error(`No such validation check: '${checkName}'`);
  return checkFn(value);
}

/**
 * fields: array of [checkName, value] pairs.
 * Runs each in order, returning the FIRST error message encountered (or
 * null if every field passes).
 *
 *   const error = validateAll([['email', email], ['password', password]]);
 *   if (error) setFormError(error);
 */
export function validateAll(fields) {
  for (const [checkName, value] of fields) {
    const error = runCheck(checkName, value);
    if (error) return error;
  }
  return null;
}