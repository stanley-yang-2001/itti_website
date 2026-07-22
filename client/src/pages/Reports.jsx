import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import '../styles/Reports.css';

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Server-side enforcement is @roles_required("publisher", "admin") on
  // POST/DELETE /api/reports - this is only the UX layer that decides
  // whether to show the button at all. Deliberately checks role
  // directly rather than AuthContext's isPublisher, since isPublisher
  // doesn't currently include admin.
  const canUpload = user?.role === 'publisher' || user?.role === 'admin';

  async function loadReports() {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to load reports.');
      setReports(await res.json());
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

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
        <div className="reports-header">
          <div>
            <h2>Reports</h2>
            <p>Published research reports and field bulletins.</p>
          </div>
          {canUpload && !showUploadForm && (
            <button type="button" className="reports-upload-toggle" onClick={() => setShowUploadForm(true)}>
              Upload Report
            </button>
          )}
        </div>

        {showUploadForm && (
          <ReportUploadForm onUploaded={handleUploaded} onCancel={() => setShowUploadForm(false)} />
        )}

        {loadError && <p className="reports-error">{loadError}</p>}
        {!loadError && reports === null && <p className="reports-status">Loading reports…</p>}
        {!loadError && reports !== null && reports.length === 0 && (
          <p className="reports-status">No reports have been published yet.</p>
        )}

        {!loadError && reports !== null && reports.length > 0 && (
          <div className="reports-grid">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                canManage={canUpload && (user?.role === 'admin' || user?.id === report.uploaded_by)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}