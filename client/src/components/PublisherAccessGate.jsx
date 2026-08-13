import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared "you need to be logged in / you need publisher access" gate,
 * used by both peer review pages (and mirroring the same pattern in
 * ReportPublish.jsx) so a signed-out visitor or a signed-in
 * non-publisher landing on either page - via the Reports page's Peer
 * Review button or a direct URL - sees an explanation instead of a
 * silent redirect. The actual review/upload actions are still
 * enforced server-side by @roles_required("publisher", "admin")
 * regardless of what this component does.
 */
export default function PublisherAccessGate({ isAuthenticated, fromPath }) {
  if (!isAuthenticated) {
    return (
      <div className="peer-review-gate">
        <h1>Log in to access Peer Review</h1>
        <p>You need an account with publisher access to review or track reports.</p>
        <Link className="btn btn-primary" to="/login" state={{ from: { pathname: fromPath } }}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="peer-review-gate">
      <h1>You don't have access to this page</h1>
      <p>
        Peer review is limited to accounts with publisher access. Your current account doesn't have that access
        level yet.
      </p>
      <p>
        To request an upgrade, contact <a href="mailto:support@ittiglobal.org">support@ittiglobal.org</a>.
      </p>
    </div>
  );
}