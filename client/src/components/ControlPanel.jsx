import { useState } from 'react';
import Reveal from './Reveal.jsx';
import '../styles/Control.css';

const OBSERVATORY_KIND_OPTIONS = [
  { value: 'GTBI', label: 'GTBI', description: 'Global Trauma Burden Index workbook (.xlsx)' },
  { value: 'ETTI', label: 'ETTI', description: 'Election Trauma & Trust Index workbook (.xlsx)' },
];

const PROFILE_KIND_OPTIONS = [
  { value: 'survey', label: 'Country Trauma Profiles', description: 'Full per-country narrative + reference (.docx)' },
  { value: 'dashboard', label: 'One-Page Dashboard Profiles', description: 'Companion set tied to GTBI/ETTI figures (.docx)' },
];

/**
 * One <UploadSection> instance per upload target (Observatory
 * GTBI/ETTI workbooks, country-profile docx files) - same
 * kind-choice-then-file-picker shape as the standalone
 * PublishGlobeData.jsx page, just parameterized so this one component
 * covers both without duplicating the form logic. `endpoint` handles
 * its own kind of validate -> archive -> rotate -> regenerate pipeline
 * server-side (globe_data.py / country_profiles_upload.py); this
 * component only needs to know the endpoint, the kind options, the
 * accepted file extension, and how to phrase a successful result.
 */
function UploadSection({ title, description, endpoint, kindOptions, accept, describeSuccess }) {
  const [kind, setKind] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [submitting, setSubmitting] = useState(false);

  function handleKindSelect(selected) {
    setKind(selected);
    setFile(null);
    setStatus(null);
  }

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!kind || !file) return;

    setSubmitting(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.description || data.error || 'Upload failed');
      }

      setStatus({ type: 'success', message: describeSuccess(data) });
      setFile(null);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="control-section">
      <h3>{title}</h3>
      <p className="control-section-desc">{description}</p>

      <div className="control-kind-choice">
        {kindOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`control-kind-btn${kind === opt.value ? ' active' : ''}`}
            onClick={() => handleKindSelect(opt.value)}
          >
            <span className="control-kind-label">{opt.label}</span>
            <span className="control-kind-desc">{opt.description}</span>
          </button>
        ))}
      </div>

      {kind && (
        <form onSubmit={handleSubmit} className="control-upload-form">
          <label className="control-file-label">
            <span>Replacement file</span>
            <input type="file" accept={accept} onChange={handleFileChange} required />
          </label>
          <button type="submit" className="control-btn" disabled={!file || submitting}>
            {submitting ? 'Processing…' : 'Upload'}
          </button>
        </form>
      )}

      {status && (
        <p className={`control-status control-status--${status.type}`}>{status.message}</p>
      )}
    </section>
  );
}

/**
 * Admin-only tab on the Profile page (see canControl in Profile.jsx -
 * user.role === 'admin', same check the two upload endpoints below
 * enforce server-side). Lets an admin push a replacement Observatory
 * workbook or country-profile document straight from the browser,
 * instead of needing shell access to run the CLI scripts in
 * server/data_scripts/ by hand.
 *
 * Both uploads follow the same on-disk pattern: the file is validated
 * before anything changes, the previous canonical file for that kind
 * is moved into an old/ subfolder (timestamped) rather than
 * overwritten - so every past version stays recoverable - and the
 * derived JSON the rest of the site actually reads
 * (server/data/country_data.json, server/data/country_profiles.json)
 * is regenerated immediately, so the change is live without a
 * redeploy. See globe_data.py and country_profiles_upload.py for the
 * exact steps.
 */
export default function ControlPanel() {
  return (
    <>
      <Reveal delay={0}>
        <UploadSection
          title="Observatory data"
          description="Replace the GTBI or ETTI workbook the globe, Observatory, and Country Profiles dashboard figures are built from."
          endpoint="/api/globe-data/upload"
          kindOptions={OBSERVATORY_KIND_OPTIONS}
          accept=".xlsx"
          describeSuccess={(data) =>
            `${data.kind} data updated for ${data.countries_updated.length} countries.`
          }
        />
      </Reveal>

      <Reveal delay={60}>
        <UploadSection
          title="Country profiles"
          description="Replace one of the two source documents the Country Profiles page's narrative text is built from."
          endpoint="/api/country-profiles/upload"
          kindOptions={PROFILE_KIND_OPTIONS}
          accept=".docx"
          describeSuccess={(data) =>
            `${data.profile_count} country profiles regenerated (${data.with_dashboard_note_count} with a dashboard note)`
            + (data.skipped.length > 0 ? ` - skipped: ${data.skipped.join(', ')}.` : '.')
          }
        />
      </Reveal>
    </>
  );
}