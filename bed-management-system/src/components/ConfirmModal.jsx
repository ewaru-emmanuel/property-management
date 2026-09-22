import React from 'react';
import '../styles/confirmModal.css';

const ConfirmModal = ({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <div
        className="confirm-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Icon */}
        <div className={`confirm-icon ${variant}`}>
          {variant === 'danger' && '⚠️'}
          {variant === 'warning' && '❕'}
          {variant === 'info' && 'ℹ️'}
        </div>

        {/* Title */}
        <h3 className="confirm-title">{title}</h3>

        {/* Message */}
        {message && <p className="confirm-message">{message}</p>}

        {/* Actions */}
        <div className="confirm-actions">
          <button
            className="confirm-btn cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-btn confirm ${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;