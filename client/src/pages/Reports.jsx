import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import { fetchFavoriteReportIds, favoriteReport, unfavoriteReport } from '../api.js';
import Reveal from '../components/Reveal.jsx';
import { isBadRequest } from '../utils/apiError';
import '../styles/Reports.css';

export default function Reports() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [reports, setReports] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

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
      <div className="reports-content">
        <Reveal delay={0}>
          <div className="reports-header">
            <div>
              <h2 className="display">Reports</h2>
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
        {!loadError && reports !== null && reports.length === 0 && (
          <p className="reports-status">No reports have been published yet.</p>
        )}

        {!loadError && reports !== null && reports.length > 0 && (
          <Reveal delay={90}>
            <div className="reports-grid">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  canManage={canUpload && (user?.role === 'admin' || user?.id === report.uploaded_by)}
                  onDelete={handleDelete}
                  isFavorited={favoriteIds.has(report.id)}
                  onToggleFavorite={isAuthenticated ? handleToggleFavorite : undefined}
                />
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}