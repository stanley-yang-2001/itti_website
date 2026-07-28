import React from 'react';

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * canManage: true if the current user is either this report's uploader
 * or an admin - passed down from Reports.jsx, which already has the
 * logged-in user's id/role, rather than this component re-deriving it.
 */
export default function ReportCard({ report, canManage, onDelete }) {
  return (
    <div className="report-card">
      {report.has_image && (
        <img
          className="report-card-image"
          src={`/api/reports/${report.id}/image`}
          alt=""
          loading="lazy"
        />
      )}
      <div className="report-card-body">
        <h3 className="report-card-title">{report.title}</h3>
        <p className="report-card-description">{report.description}</p>
        <div className="report-card-meta">
          <span className="report-card-filetype">{report.file_type.toUpperCase()}</span>
          {report.file_size_bytes && <span>{formatFileSize(report.file_size_bytes)}</span>}
          <span>{formatDate(report.created_at)}</span>
        </div>
        <div className="report-card-actions">
          <a
            className="report-card-download"
            href={`/api/reports/${report.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
          {canManage && (
            <button
              type="button"
              className="report-card-delete"
              onClick={() => onDelete(report.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}