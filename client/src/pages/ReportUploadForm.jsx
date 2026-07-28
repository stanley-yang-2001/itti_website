import React, { useState } from 'react';
import { checkReportTitle, checkReportDescription } from '../utils/formValidation.js';

/**
 * Publisher/admin-only upload form for the Reports page. The actual
 * enforcement is server-side (@roles_required("publisher", "admin") on
 * POST /api/reports) - this component is only ever rendered after
 * Reports.jsx has already checked the user's role, but doesn't re-check
 * here itself, since its parent is the single source of truth for
 * whether to show it at all.
 */
export default function ReportUploadForm({ onUploaded, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors = {};
    const titleError = checkReportTitle(title);
    if (titleError) errors.title = titleError;
    const descriptionError = checkReportDescription(description);
    if (descriptionError) errors.description = descriptionError;
    if (!file) errors.file = 'A PDF or Word document is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('file', file);
    if (image) formData.append('image', image);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.description || data.error || 'Upload failed.');
      }
      onUploaded(data);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="report-upload-form">
      <label className="report-upload-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Report title"
        />
        {fieldErrors.title && <span className="report-upload-field-error">{fieldErrors.title}</span>}
      </label>

      <label className="report-upload-field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short summary of this report"
          rows={4}
        />
        {fieldErrors.description && (
          <span className="report-upload-field-error">{fieldErrors.description}</span>
        )}
      </label>

      <label className="report-upload-field">
        <span>Report file (PDF or Word document)</span>
        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0] || null)} />
        {fieldErrors.file && <span className="report-upload-field-error">{fieldErrors.file}</span>}
      </label>

      <label className="report-upload-field">
        <span>Cover image (optional)</span>
        <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setImage(e.target.files[0] || null)} />
      </label>

      {status && <p className={`report-upload-status report-upload-status--${status.type}`}>{status.message}</p>}

      <div className="report-upload-actions">
        <button type="submit" className="report-upload-submit" disabled={submitting}>
          {submitting ? 'Uploading…' : 'Upload report'}
        </button>
        <button type="button" className="report-upload-cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}