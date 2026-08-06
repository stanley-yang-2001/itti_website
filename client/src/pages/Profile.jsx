import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ReportCard from '../components/ReportCard.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import Reveal from '../components/Reveal.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import ControlPanel from '../components/ControlPanel.jsx';
import {
  fetchSavedObservatoryCharts, deleteSavedObservatoryChart,
  fetchFavoriteReports, unfavoriteReport,
  fetchMyReports,
} from '../api.js';
import '../styles/Profile.css';

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Shows the user's avatar image, falling back to initials if the URL
 *  fails to load (e.g. a Google avatar URL that 403s) rather than
 *  leaving a broken-image icon with overlapping alt text on the page. */
function ProfileAvatar({ name, email, pictureUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = pictureUrl && !imageFailed;

  return (
    <div className="profile-avatar">
      {showImage ? (
        <img src={pictureUrl} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span>{initials(name, email)}</span>
      )}
    </div>
  );
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const REVIEW_STATUS_LABEL = {
  published: { label: 'Published', className: 'published' },
  pending_review: { label: 'Pending Review', className: 'pending' },
  changes_requested: { label: 'Changes Requested', className: 'changes' },
};

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'publications', label: 'Publications' },
  { key: 'settings', label: 'Settings' },
];
// Admin-only, appended in the component below rather than listed here
// directly - keeps this base list meaningful on its own and the
// role check colocated with the one place it's used.
const CONTROL_TAB = { key: 'control', label: 'Control' };

function SavedChartCard({ chart, onDelete }) {
  const config = chart.config || {};
  const panelCount = Array.isArray(config.panels) ? config.panels.length : 0;
  const countryCount = Array.isArray(config.panels)
    ? new Set(config.panels.map((p) => p.countryCode)).size
    : 0;

  return (
    <Link to={`/observatory?chart=${chart.id}`} className="profile-chart-card">
      <div className="profile-chart-card-head">
        <span className={`profile-chart-badge indicator-${chart.indicator.toLowerCase()}`}>{chart.indicator}</span>
        <button
          type="button"
          className="profile-chart-delete"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(chart.id); }}
          aria-label="Delete saved chart"
        >
          ✕
        </button>
      </div>
      <h4 className="profile-chart-title">{chart.title}</h4>
      <p className="profile-chart-meta">
        {config.chartType ? `${config.chartType} · ` : ''}
        {panelCount} panel{panelCount === 1 ? '' : 's'}
        {countryCount > 0 ? ` · ${countryCount} countr${countryCount === 1 ? 'y' : 'ies'}` : ''}
      </p>
      <p className="profile-chart-date">Saved {formatDate(chart.created_at)}</p>
      <span className="profile-chart-card-cta">Open in Observatory &rarr;</span>
    </Link>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const canPublish = user?.role === 'publisher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const tabs = isAdmin ? [...TABS, CONTROL_TAB] : TABS;

  const [activeTab, setActiveTab] = useState('profile');

  const [charts, setCharts] = useState(null); // null = loading
  const [chartsError, setChartsError] = useState(null);

  const [favoriteReports, setFavoriteReports] = useState(null);
  const [favoritesError, setFavoritesError] = useState(null);

  const [myReports, setMyReports] = useState(null);
  const [myReportsError, setMyReportsError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    fetchSavedObservatoryCharts()
      .then(setCharts)
      .catch((err) => setChartsError(err.message));
  }, []);

  useEffect(() => {
    fetchFavoriteReports()
      .then(setFavoriteReports)
      .catch((err) => setFavoritesError(err.message));
  }, []);

  useEffect(() => {
    if (!canPublish) return;
    loadMyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPublish]);

  function loadMyReports() {
    fetchMyReports()
      .then(setMyReports)
      .catch((err) => setMyReportsError(err.message));
  }

  async function handleDeleteChart(chartId) {
    setCharts((prev) => prev.filter((c) => c.id !== chartId)); // optimistic
    try {
      await deleteSavedObservatoryChart(chartId);
    } catch {
      fetchSavedObservatoryCharts().then(setCharts).catch(() => {}); // revert by re-fetching
    }
  }

  async function handleUnfavoriteReport(reportId) {
    setFavoriteReports((prev) => prev.filter((r) => r.id !== reportId)); // optimistic
    try {
      await unfavoriteReport(reportId);
    } catch {
      fetchFavoriteReports().then(setFavoriteReports).catch(() => {});
    }
  }

  function handleReportUploaded() {
    setShowUploadForm(false);
    loadMyReports();
  }

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-layout">
        {/* ---------- Vertical nav ---------- */}
        <nav className="profile-sidebar" aria-label="Profile sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`profile-sidebar-link${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="profile-content">
          {/* ---------- Profile ---------- */}
          {activeTab === 'profile' && (
            <Reveal delay={0}>
              <section className="profile-header">
                <ProfileAvatar name={user.name} email={user.email} pictureUrl={user.picture_url} />
                <div className="profile-header-info">
                  <h1 className="profile-name display">{user.name || user.email}</h1>
                  <p className="profile-email">{user.email}</p>
                  <div className="profile-header-meta">
                    <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    {user.created_at && <span className="profile-member-since">Member since {formatDate(user.created_at)}</span>}
                  </div>
                </div>
              </section>
            </Reveal>
          )}

          {/* ---------- Favorites ---------- */}
          {activeTab === 'favorites' && (
            <Reveal delay={0}>
              <section className="profile-section">
                <h2 className="profile-section-title display">Favorites</h2>

                <h3 className="profile-subsection-title">Observatory charts</h3>
                {chartsError && <p className="profile-error">{chartsError}</p>}
                {!chartsError && charts === null && <p className="profile-status">Loading saved charts…</p>}
                {!chartsError && charts !== null && charts.length === 0 && (
                  <div className="profile-empty">
                    <p>No saved charts yet.</p>
                    <Link to="/observatory" className="btn btn-secondary">Go to Observatory</Link>
                  </div>
                )}
                {!chartsError && charts !== null && charts.length > 0 && (
                  <div className="profile-charts-grid">
                    {charts.map((chart) => (
                      <SavedChartCard key={chart.id} chart={chart} onDelete={handleDeleteChart} />
                    ))}
                  </div>
                )}

                <h3 className="profile-subsection-title">Reports</h3>
                {favoritesError && <p className="profile-error">{favoritesError}</p>}
                {!favoritesError && favoriteReports === null && <p className="profile-status">Loading favorite reports…</p>}
                {!favoritesError && favoriteReports !== null && favoriteReports.length === 0 && (
                  <div className="profile-empty">
                    <p>No favorited reports yet.</p>
                    <Link to="/reports" className="btn btn-secondary">Browse Reports</Link>
                  </div>
                )}
                {!favoritesError && favoriteReports !== null && favoriteReports.length > 0 && (
                  <div className="profile-reports-grid">
                    {favoriteReports.map((report) => (
                      <div key={report.id} className="profile-favorite-report">
                        <ReportCard
                          report={report}
                          canManage={false}
                          isFavorited
                          onToggleFavorite={handleUnfavoriteReport}
                        />
                        <Link to={`/reports?highlight=${report.id}`} className="profile-favorite-report-link">
                          View in Reports &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
          )}

          {/* ---------- Publications ---------- */}
          {activeTab === 'publications' && (
            <Reveal delay={0}>
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title display">Publications</h2>
                  {canPublish && !showUploadForm && (
                    <button type="button" className="btn btn-primary" onClick={() => setShowUploadForm(true)}>
                      New Report
                    </button>
                  )}
                </div>

                {!canPublish && (
                  <div className="profile-callout">
                    <p>Publishing is available to Publisher accounts.</p>
                    <p>
                      To request access, contact{' '}
                      <a href="mailto:contact@itti.org">contact@itti.org</a>.
                    </p>
                  </div>
                )}

                {canPublish && showUploadForm && (
                  <ReportUploadForm onUploaded={handleReportUploaded} onCancel={() => setShowUploadForm(false)} />
                )}

                {canPublish && (
                  <>
                    {myReportsError && <p className="profile-error">{myReportsError}</p>}
                    {!myReportsError && myReports === null && <p className="profile-status">Loading your publications…</p>}
                    {!myReportsError && myReports !== null && myReports.length === 0 && !showUploadForm && (
                      <p className="profile-status">You haven't published any reports yet.</p>
                    )}
                    {!myReportsError && myReports !== null && myReports.length > 0 && (
                      <div className="profile-publications-list">
                        {myReports.map((report) => {
                          const statusInfo = REVIEW_STATUS_LABEL[report.review_status] || { label: report.review_status, className: '' };
                          return (
                            <div key={report.id} className="profile-publication-row">
                              <div className="profile-publication-info">
                                <span className="profile-publication-title">{report.title}</span>
                                <span className="profile-publication-date">{formatDate(report.created_at)} · v{report.version}</span>
                              </div>
                              <span className={`profile-status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
            </Reveal>
          )}

          {/* ---------- Settings ---------- */}
          {activeTab === 'settings' && (
            <section className="profile-section profile-settings-section">
              <h2 className="profile-section-title display">Settings</h2>
              <SettingsPanel />
            </section>
          )}

          {/* ---------- Control (admin only) ---------- */}
          {activeTab === 'control' && isAdmin && (
            <section className="profile-section profile-settings-section">
              <h2 className="profile-section-title display">Control</h2>
              <p className="profile-section-desc">
                Upload replacement data files for the Observatory and Country Profiles. Every
                upload is validated before anything changes, and the file it replaces is kept
                (not deleted) for version history.
              </p>
              <ControlPanel />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}