/**
 * A 400 response means the request itself doesn't make sense (bad/missing
 * params, a resource that was never going to exist, etc.) - conceptually
 * different from a 500 (something broke) or a network failure, and worth
 * routing to the same shared "this isn't available" messaging (see
 * pages/Unavailable.jsx and components/UnavailableMessage.jsx) rather than
 * a raw error string. Pages that fetch something the user navigated
 * directly to (not from their own action, e.g. a stale/bad link) should
 * check this before falling back to a generic error message.
 */
export function isBadRequest(response) {
  return !!response && response.status === 400;
}