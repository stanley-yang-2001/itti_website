import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Reveal from '../components/Reveal.jsx';
import '../styles/PublisherDashboard.css';

function formatDate(isoString) {
  if (!isoString) return 'Unknown time';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString();
}

/**
 * Single landing page for everything a publisher can do, rather than
 * two unrelated nav items (documents, globe data). Wrapped in
 * <ProtectedRoute requireRole="publisher"> in App.jsx, unlike
 * PublishGlobeData, since there's no need to explain "no access" to a
 * non-publisher for a page whose only content IS publisher tools.
 */
export default function PublisherDashboard() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState(null); // null = loading
  const [uploadsError, setUploadsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/globe-data/uploads', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load upload history');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setUploads(data);
      })
      .catch((err) => {
        if (!cancelled) setUploadsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pub-dashboard-page">
      <h2 className="display">Publisher Dashboard</h2>
      <p>Signed in as {user?.name || user?.email} — publisher access.</p>

      <Reveal delay={0}>
        <div className="pub-dashboard-actions">
          <Link to="/publish" className="pub-dashboard-card">
            <h3>Documents</h3>
            <p>Upload, list, or remove documents attached to your account.</p>
          </Link>
          <Link to="/publish/globe-data" className="pub-dashboard-card">
            <h3>Globe Data</h3>
            <p>Upload a GTBI or ETTI workbook to update the figures shown on the globe.</p>
          </Link>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <section className="pub-dashboard-history">
          <h3>Recent globe data uploads</h3>

          {uploadsError && <p className="pub-dashboard-error">{uploadsError}</p>}
          {!uploadsError && uploads === null && <p className="pub-dashboard-muted">Loading…</p>}
          {!uploadsError && uploads !== null && uploads.length === 0 && (
            <p className="pub-dashboard-muted">No uploads yet.</p>
          )}

          {!uploadsError && uploads && uploads.length > 0 && (
            <table className="pub-dashboard-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>File</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.filename}>
                    <td>
                      <span className={`kind-badge kind-badge--${u.kind.toLowerCase()}`}>{u.kind}</span>
                    </td>
                    <td>{u.original_filename}</td>
                    <td>{formatDate(u.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </Reveal>
    </div>
  );
}