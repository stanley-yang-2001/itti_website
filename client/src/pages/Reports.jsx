import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportViewerModal from '../components/ReportViewerModal.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import { fetchFavoriteReportIds, favoriteReport, unfavoriteReport } from '../api.js';
import { REPORT_CATEGORIES } from '../constants/reportCategories.js';
import Reveal from '../components/Reveal.jsx';
import SEO from '../components/SEO.jsx';
import { isBadRequest } from '../utils/apiError';
import '../styles/Reports.css';

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { user, isAuthenticated } = useAuth();
  const [reports, setReports] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(REPORT_CATEGORIES[0]);
  const [readingReport, setReadingReport] = useState(null);

  // Server-side enforcement is @roles_required("publisher", "admin") on
  // POST/DELETE /api/reports - this is only the UX layer that decides
  // whether to show the button at all. Deliberately checks role
  // directly rather than AuthContext's isPublisher, since isPublisher
  // doesn't currently include admin.
  const canUpload = user?.role === 'publisher' || user?.role === 'admin';

  async function loadReports() {
    try {
      const res = await fetch('/api/reports');
      if (isBadRequest(res)) {
        navigate('/unavailable?from=%2Freports&fromLabel=Back%20to%20Reports');
        return;
      }
      if (!res.ok) throw new Error('Failed to load reports.');
      setReports(await res.json());
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // Coming from a favorited-report link on the Profile page (?highlight=<id>):
  // the reports list is now split into sections, and the highlighted
  // report might not be in whichever one is active by default - this
  // jumps activeCategory to wherever it actually lives first, so its
  // card exists in the DOM at all, before the effect below tries to
  // scroll to it.
  useEffect(() => {
    if (!highlightId || reports === null) return;
    const match = reports.find((r) => String(r.id) === highlightId);
    if (match) setActiveCategory(match.category);
  }, [highlightId, reports]);

  // There's no per-report detail page yet, so this scrolls the list to
  // and outlines the matching card instead, once it's actually
  // rendered - which now depends on activeCategory too, since the card
  // only exists once the section-switch effect above has run.
  useEffect(() => {
    if (!highlightId || reports === null) return;
    const el = document.getElementById(`report-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, reports, activeCategory]);

  // Favorite state is a separate load, gated on being logged in at all -
  // a logged-out visitor simply never sees any star as filled (and
  // ReportCard hides the star entirely for them - see onToggleFavorite
  // being undefined below).
  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    fetchFavoriteReportIds()
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => {}); // non-critical - stars just won't show as filled
  }, [isAuthenticated]);

  // /api/reports already returns newest-created first (see
  // get_published_reports in models/report.py) - grouping by category
  // here is a pure filter over that list, so within each section the
  // creation-date order carries through untouched rather than being
  // re-sorted.
  const reportsByCategory = useMemo(() => {
    const grouped = new Map(REPORT_CATEGORIES.map((c) => [c, []]));
    for (const report of reports || []) {
      if (grouped.has(report.category)) {
        grouped.get(report.category).push(report);
      }
    }
    return grouped;
  }, [reports]);

  const activeIndex = REPORT_CATEGORIES.indexOf(activeCategory);
  const activeReports = reportsByCategory.get(activeCategory) || [];

  function goToSection(offset) {
    const nextIndex = (activeIndex + offset + REPORT_CATEGORIES.length) % REPORT_CATEGORIES.length;
    setActiveCategory(REPORT_CATEGORIES[nextIndex]);
  }

  async function handleToggleFavorite(reportId, currentlyFavorited) {
    // Optimistic update - toggling a favorite is low-stakes enough that
    // waiting on the round-trip before reflecting it would feel laggy.
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavorited) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
    try {
      if (currentlyFavorited) await unfavoriteReport(reportId);
      else await favoriteReport(reportId);
    } catch {
      // Revert on failure.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlyFavorited) next.add(reportId);
        else next.delete(reportId);
        return next;
      });
    }
  }

  function handleUploaded() {
    setShowUploadForm(false);
    loadReports();
  }

  async function handleDelete(reportId) {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      loadReports();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoadError(data.description || data.error || 'Could not delete report.');
    }
  }

  return (
    <div className="reports-page">
      <SEO
        path="/reports"
        title="Reports"
        description="Published research reports and field bulletins from the International Truth & Trauma Institute, covering collective trauma documentation and trauma-informed governance."
      />
      <div className="reports-content">
        <Reveal delay={0}>
          <div className="reports-header">
            <div>
              <h1 className="display">Reports</h1>
              <p>Published research reports and field bulletins.</p>
            </div>
            {canUpload && !showUploadForm && (
              <button type="button" className="btn btn-primary" onClick={() => setShowUploadForm(true)}>
                Upload Report
              </button>
            )}
          </div>
        </Reveal>

        {showUploadForm && (
          <ReportUploadForm onUploaded={handleUploaded} onCancel={() => setShowUploadForm(false)} />
        )}

        {loadError && <p className="reports-error">{loadError}</p>}
        {!loadError && reports === null && <p className="reports-status">Loading reports…</p>}

        {!loadError && reports !== null && (
          <>
            <nav className="reports-section-nav" aria-label="Report sections">
              {REPORT_CATEGORIES.map((category) => {
                const count = reportsByCategory.get(category)?.length || 0;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`reports-section-tab${category === activeCategory ? ' is-active' : ''}`}
                    onClick={() => setActiveCategory(category)}
                    aria-current={category === activeCategory ? 'true' : undefined}
                  >
                    {category}
                    <span className="reports-section-tab-count">{count}</span>
                  </button>
                );
              })}
            </nav>

            <div className="reports-section-pager">
              <button type="button" className="reports-section-pager-btn" onClick={() => goToSection(-1)}>
                ← Previous section
              </button>
              <span className="reports-section-pager-position">
                Section {activeIndex + 1} of {REPORT_CATEGORIES.length}
              </span>
              <button type="button" className="reports-section-pager-btn" onClick={() => goToSection(1)}>
                Next section →
              </button>
            </div>

            <Reveal delay={90} key={activeCategory}>
              <div>
                <h3 className="reports-section-heading">{activeCategory}</h3>
                {activeReports.length === 0 ? (
                  <p className="reports-status">No reports have been published in this section yet.</p>
                ) : (
                  <div className="reports-grid">
                    {activeReports.map((report) => (
                      <div
                        key={report.id}
                        id={`report-${report.id}`}
                        className={String(report.id) === highlightId ? 'reports-card-highlight' : undefined}
                      >
                        <ReportCard
                          report={report}
                          canManage={canUpload && (user?.role === 'admin' || user?.id === report.uploaded_by)}
                          onDelete={handleDelete}
                          isFavorited={favoriteIds.has(report.id)}
                          onToggleFavorite={isAuthenticated ? handleToggleFavorite : undefined}
                          onRead={setReadingReport}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </>
        )}
      </div>

      {readingReport && (
        <ReportViewerModal report={readingReport} onClose={() => setReadingReport(null)} />
      )}
    </div>
  );
}