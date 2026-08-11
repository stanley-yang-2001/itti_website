import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Generic reusable modal - overlay + centered panel with a title, body
 * (children), and an optional footer (typically action buttons). Used by
 * CertificationEnroll.jsx (as CertificationEnrollModal) so enrolling in a
 * certification happens right on the Certifications page instead of
 * navigating to a separate route.
 *
 * onClose: called when the overlay is clicked, Esc is pressed, or the ×
 * button is clicked. Pass undefined (not a no-op function) to make the
 * modal non-dismissible - e.g. while a payment is mid-flight, so a stray
 * click or Esc can't abandon it. When onClose is undefined, the × button
 * and overlay-click-to-close are both simply not rendered/wired.
 *
 * footer: optional ReactNode rendered in a bottom action bar (buttons use
 * the app-modal-btn / app-modal-btn--primary classes below).
 *
 * wide: use the wider max-width variant (720px instead of 520px) - used
 * by PrivacyPolicyModal for its longer content.
 */
export default function Modal({ title, onClose, footer, children, wide }) {
  useEffect(() => {
    if (!onClose) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (onClose && e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div className="app-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className={`app-modal${wide ? ' app-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="app-modal-header">
          <h3 className="app-modal-title">{title}</h3>
          {onClose && (
            <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div className="app-modal-body">{children}</div>
        {footer && <div className="app-modal-actions">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}