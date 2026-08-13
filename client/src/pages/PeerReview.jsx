import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportViewerModal from '../components/ReportViewerModal.jsx';
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/PeerReview.css';

// Must stay in sync with REQUIRED_APPROVALS in server/models/report.py -
// the server is the source of truth for what actually publishes a
// report, this is only for the "1 of 2 approvals" progress text.
const REQUIRED_APPROVALS = 3;

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * One report's review controls + existing comments, shown under its
 * ReportCard. Fetches its own reviews independently (rather than
 * PeerReview.jsx fetching all of them up front) since there's no bulk
 * endpoint for "reviews across many reports" and most of these lists
 * are short.
 */
function ReviewPanel({ report, currentUser, onDecided }) {
  const [reviews, setReviews] = useState(null); // null = loading
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(null); // 'approve' | 'reject' | null
  const [error, setError] = useState(null);

  const isOwnReport = report.uploaded_by === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  function loadReviews() {
    fetch(`/api/reports/${report.id}/reviews`, { credentials: 'include' })
      .then((res) => res.json())
      .then(setReviews)
      .catch(() => setReviews([]));
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, report.version]);

  const currentVersionReviews = (reviews || []).filter((r) => r.version === report.version);
  const approvals = currentVersionReviews.filter((r) => r.decision === 'approve');
  const myDecision = currentVersionReviews.find((r) => r.reviewer_id === currentUser.id)?.decision;

  async function submitDecision(decision) {
    if (decision === 'reject' && !comment.trim()) {
      setError('A comment is required when requesting changes.');
      return;
    }
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.description || data.error || 'Could not submit review.');
      setComment('');
      loadReviews();
      onDecided(report.id, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="peer-review-panel">
      {isOwnReport ? (
        <p className="peer-review-own-note">This is your submission — you can't review your own report.</p>
      ) : myDecision ? (
        <p className="peer-review-own-note">
          You already {myDecision === 'approve' ? 'approved' : 'requested changes on'} this version.
        </p>
      ) : (
        <div className="peer-review-form">
          {isAdmin && (
            <p className="peer-review-admin-note">
              As an admin, approving publishes this immediately — it doesn't need a second approval.
            </p>
          )}
          <textarea
            className="peer-review-comment-input"
            placeholder="Comment (required to request changes, optional to approve)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
          {error && <p className="peer-review-error">{error}</p>}
          <div className="peer-review-actions">
            <button
              type="button"
              className="peer-review-approve-btn"
              disabled={submitting !== null}
              onClick={() => submitDecision('approve')}
            >
              {submitting === 'approve' ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              className="peer-review-reject-btn"
              disabled={submitting !== null}
              onClick={() => submitDecision('reject')}
            >
              {submitting === 'reject' ? 'Requesting changes…' : 'Request Changes'}
            </button>
          </div>
        </div>
      )}

      <p className="peer-review-progress">
        {approvals.length} of {REQUIRED_APPROVALS} approvals
        {approvals.length > 0 && ` (${approvals.map((a) => a.reviewer_name).join(', ')})`}
      </p>

      {reviews === null ? (
        <p className="peer-review-status">Loading comments…</p>
      ) : currentVersionReviews.length > 0 ? (
        <ul className="peer-review-comments">
          {currentVersionReviews.map((r) => (
            <li key={r.id} className={`peer-review-comment peer-review-comment--${r.decision}`}>
              <span className="peer-review-comment-head">
                {r.reviewer_name} · {r.decision === 'approve' ? 'Approved' : 'Requested changes'} · {formatDate(r.created_at)}
              </span>
              {r.comment && <p className="peer-review-comment-body">{r.comment}</p>}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Peer Review page - reachable by role publisher or admin. Linked from
 * Profile > Publications. Not wrapped in <ProtectedRoute> in App.jsx
 * on purpose (mirrors ReportPublish.jsx): a signed-out visitor or a
 * signed-in non-publisher landing here - whether via that link or a
 * direct URL - sees an explanation of why they can't use this page,
 * rather than being silently redirected elsewhere. Server-side
 * enforcement is the real gate (@roles_required("publisher", "admin")
 * on every review-queue/review-decision route this page calls).
 *
 * Two sections:
 *   - Awaiting Review (GET /api/reports/pending): the actual review
 *     queue. A report the current user uploaded still shows here (so
 *     they can see it's in the queue and who's reviewed it so far),
 *     but with no review controls of its own - see ReviewPanel.
 *   - Changes Requested (GET /api/reports/changes-requested): reports
 *     sent back for revision, shown read-only so reviewers can see
 *     what's stalled and why. Not actionable here - only the
 *     uploader's own resubmission (POST /api/reports/<id>/resubmit,
 *     not yet wired to any page) moves one of these back to Awaiting
 *     Review.
 *
 * Reports here get the exact same reader (ReportViewerModal) as the
 * public Reports page - the only difference is the review UI attached
 * underneath.
 */
export default function PeerReview() {
  const { user, isAuthenticated, isPublisher, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [pending, setPending] = useState(null);
  const [changesRequested, setChangesRequested] = useState(null);
  const [error, setError] = useState(null);
  const [readingReport, setReadingReport] = useState(null);

  function loadPending() {
    fetch('/api/reports/pending', { credentials: 'include' })
      .then((res) => res.json())
      .then(setPending)
      .catch(() => setError('Could not load reports awaiting review.'));
  }

  function loadChangesRequested() {
    fetch('/api/reports/changes-requested', { credentials: 'include' })
      .then((res) => res.json())
      .then(setChangesRequested)
      .catch(() => {}); // secondary section - a failure here shouldn't block the main queue
  }

  useEffect(() => {
    loadPending();
    loadChangesRequested();
  }, []);

  // A notification, or the Publications list, can link here with
  // ?highlight=<report_id> for a report that needs attention - once
  // both lists have loaded, scroll to and outline whichever card
  // matches (it may be in either section, so this doesn't need to
  // know which one ahead of time).
  useEffect(() => {
    if (!highlightId || pending === null || changesRequested === null) return;
    const el = document.getElementById(`peer-review-report-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, pending, changesRequested]);

  function handleDecided(reportId, updatedReport) {
    // A decision may have moved the report out of "pending" (published
    // or changes_requested) - simplest correct thing is to just
    // re-fetch both lists rather than try to patch state in place.
    loadPending();
    loadChangesRequested();
  }

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="peer-review-page">
        <SEO path="/peer-review" title="Peer Review" noindex />
        <div className="peer-review-gate">
          <h1>Log in to review reports</h1>
          <p>You need an account with publisher access to review reports awaiting approval.</p>
          <Link className="btn btn-primary" to="/login" state={{ from: { pathname: '/peer-review' } }}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (!isPublisher) {
    return (
      <div className="peer-review-page">
        <SEO path="/peer-review" title="Peer Review" noindex />
        <div className="peer-review-gate">
          <h1>You don't have access to this page</h1>
          <p>
            Reviewing reports is limited to accounts with publisher access. Your current account doesn't have
            that access level yet.
          </p>
          <p>
            To request an upgrade, contact{' '}
            <a href="mailto:support@ittiglobal.org">support@ittiglobal.org</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="peer-review-page">
      <Reveal delay={0}>
        <div className="peer-review-header">
          <h2 className="display">Peer Review</h2>
          <p>
            Reports need {REQUIRED_APPROVALS} publisher approvals to publish (an admin's approval publishes on its
            own). You can't review your own submissions.
          </p>
        </div>
      </Reveal>

      {error && <p className="peer-review-error">{error}</p>}

      <Reveal delay={30}>
        <section className="peer-review-section">
          <h3 className="peer-review-section-heading">Awaiting Review</h3>
          {pending === null && <p className="peer-review-status">Loading…</p>}
          {pending !== null && pending.length === 0 && (
            <p className="peer-review-status">Nothing is awaiting review right now.</p>
          )}
          {pending !== null && pending.length > 0 && (
            <div className="peer-review-list">
              {pending.map((report) => (
                <div
                  key={report.id}
                  id={`peer-review-report-${report.id}`}
                  className={`peer-review-item${String(report.id) === highlightId ? ' peer-review-item-highlight' : ''}`}
                >
                  <ReportCard report={report} onRead={setReadingReport} />
                  <ReviewPanel report={report} currentUser={user} onDecided={handleDecided} />
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal delay={60}>
        <section className="peer-review-section">
          <h3 className="peer-review-section-heading">Changes Requested</h3>
          <p className="peer-review-section-desc">
            Sent back to their uploader for revision. Read-only here until they resubmit.
          </p>
          {changesRequested !== null && changesRequested.length === 0 && (
            <p className="peer-review-status">Nothing is waiting on a resubmission.</p>
          )}
          {changesRequested !== null && changesRequested.length > 0 && (
            <div className="peer-review-list">
              {changesRequested.map((report) => (
                <div
                  key={report.id}
                  id={`peer-review-report-${report.id}`}
                  className={`peer-review-item${String(report.id) === highlightId ? ' peer-review-item-highlight' : ''}`}
                >
                  <ReportCard report={report} onRead={setReadingReport} />
                  <ReviewPanel report={report} currentUser={user} onDecided={handleDecided} />
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {readingReport && (
        <ReportViewerModal report={readingReport} onClose={() => setReadingReport(null)} />
      )}
    </div>
  );
}