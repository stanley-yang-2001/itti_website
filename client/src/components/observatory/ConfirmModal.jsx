export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="obs-modal-overlay" onClick={onCancel}>
      <div className="obs-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="obs-modal-actions">
          <button type="button" className="obs-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="obs-btn obs-btn-danger" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}