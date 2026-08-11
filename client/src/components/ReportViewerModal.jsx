import React, { useEffect, useState } from 'react';

/**
 * Inline reader for a report's underlying file.
 *
 * PDFs are handed to the browser's own PDF viewer via an <iframe> -
 * every evergreen browser Claude/ITTI supports renders those natively,
 * so there's no reason to ship a PDF.js bundle for it.
 *
 * DOCX has no native browser renderer, so this fetches the file as
 * bytes and converts it to HTML client-side with mammoth. That HTML is
 * a reasonable-fidelity reading view (headings, lists, bold/italic,
 * paragraphs) - it is NOT pixel-faithful to Word and doesn't attempt
 * to be; anyone who needs the exact original still has the Download
 * link.
 *
 * Legacy .doc (pre-2007 binary format) can't be converted by mammoth
 * (it only understands the .docx XML format), so it falls back to a
 * "no inline preview" message with a Download link.
 */
export default function ReportViewerModal({ report, onClose }) {
  const [state, setState] = useState({ status: 'loading', html: null, error: null });

  const fileUrl = `/api/reports/${report.id}/file`;
  const isPdf = report.file_type === 'pdf';
  const isDocx = report.file_type === 'docx';

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isDocx) return;
    let cancelled = false;
    setState({ status: 'loading', html: null, error: null });

    (async () => {
      try {
        const res = await fetch(fileUrl, { credentials: 'include' });
        if (!res.ok) throw new Error('Could not load this report.');
        const arrayBuffer = await res.arrayBuffer();
        // Loaded lazily - mammoth is only needed on this one screen,
        // no reason to add it to every page's initial bundle.
        const mammoth = await import('mammoth');
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setState({ status: 'ready', html, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', html: null, error: err.message || 'Could not render this document.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, isDocx]);

  return (
    <div className="report-viewer-overlay" onClick={onClose}>
      <div className="report-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-viewer-header">
          <h3 title={report.title}>{report.title}</h3>
          <div className="report-viewer-header-actions">
            <a
              className="report-viewer-download"
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button type="button" className="report-viewer-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="report-viewer-body">
          {isPdf && (
            <iframe className="report-viewer-pdf-frame" src={fileUrl} title={report.title} />
          )}

          {isDocx && state.status === 'loading' && (
            <p className="report-viewer-status">Loading document…</p>
          )}
          {isDocx && state.status === 'error' && (
            <p className="report-viewer-status report-viewer-status--error">{state.error}</p>
          )}
          {isDocx && state.status === 'ready' && (
            <div className="report-viewer-docx" dangerouslySetInnerHTML={{ __html: state.html }} />
          )}

          {!isPdf && !isDocx && (
            <p className="report-viewer-status">
              No inline preview is available for this file type. Use Download above instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}