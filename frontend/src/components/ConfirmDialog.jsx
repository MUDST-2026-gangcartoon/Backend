import React, { useEffect, useId } from 'react';
import Icon from './Icon.jsx';

// กล่องยืนยัน/แจ้งผล ใช้ชุดสีเดียวกับ popup อื่นของเว็บ (แทน window.confirm / window.alert)
// ใส่ cancelLabel = null เพื่อให้เป็นกล่องแจ้งผลที่มีปุ่มเดียว
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'ตกลง',
  cancelLabel = 'ยกเลิก',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="popup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className="popup-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="popup-close"
          aria-label="ปิด"
          onClick={onCancel}
          disabled={loading}
        >
          <Icon name="close" size="1.2em" strokeWidth={2} />
        </button>

        <h2 id={titleId} className="popup-title">
          {title}
        </h2>
        {message && <p className="popup-text">{message}</p>}

        <div className="popup-actions">
          {cancelLabel && (
            <button
              type="button"
              className="popup-btn ghost"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            className={`popup-btn ${tone}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? 'กำลังดำเนินการ…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
