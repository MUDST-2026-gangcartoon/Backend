
import React, { useEffect, useState } from 'react';
import './app-dialog.css';

/**
 * แสดง Popup แจ้งเตือน
 * ตัวอย่าง: showAppAlert('บันทึกสำเร็จ', { title: 'สำเร็จ' });
 */
export function showAppAlert(message, options = {}) {
  window.dispatchEvent(
    new CustomEvent('app-dialog:open', {
      detail: {
        type: 'alert',
        message: String(message ?? ''),
        title: options.title,
      },
    })
  );
}

/**
 * แสดง Popup ยืนยันการดำเนินการ
 * คืนค่า true เมื่อกดยืนยัน และ false เมื่อยกเลิก
 */
export function showAppConfirm(message, options = {}) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('app-dialog:open', {
        detail: {
          type: 'confirm',
          message: String(message ?? ''),
          title: options.title,
          resolve,
        },
      })
    );
  });
}

export default function AppDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const handleOpen = (event) => {
      const detail = event.detail;

      if (!detail || !['alert', 'confirm'].includes(detail.type)) {
        return;
      }

      setDialog(detail);
    };

    window.addEventListener('app-dialog:open', handleOpen);

    return () => {
      window.removeEventListener('app-dialog:open', handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog]);

  const closeDialog = (result) => {
    setDialog((current) => {
      if (!current) return null;

      if (typeof current.resolve === 'function') {
        current.resolve(result);
      }

      return null;
    });
  };

  if (!dialog) return null;

  const isConfirm = dialog.type === 'confirm';

  const isDanger =
    String(dialog.title ?? '').includes('ลบ') ||
    String(dialog.message ?? '').includes('ลบกิจกรรม') ||
    String(dialog.message ?? '').includes('ลบอีเวนต์');

  return (
    <div
      className="app-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog(false);
        }
      }}
    >
      <section
        className="app-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
      >
        <div
          className={`app-dialog-icon ${isDanger ? 'is-danger' : ''}`}
          aria-hidden="true"
        >
          {isDanger ? '!' : isConfirm ? '?' : '✓'}
        </div>

        <h2 id="app-dialog-title">
          {dialog.title ||
            (isConfirm
              ? isDanger
                ? 'ยืนยันการลบ'
                : 'ยืนยันการดำเนินการ'
              : 'แจ้งให้ทราบ')}
        </h2>

        <p id="app-dialog-message">{dialog.message}</p>

        <div className="app-dialog-actions">
          {isConfirm && (
            <button
              type="button"
              className="app-dialog-button secondary"
              onClick={() => closeDialog(false)}
            >
              ยกเลิก
            </button>
          )}

          <button
            type="button"
            className="app-dialog-button primary"
            onClick={() => closeDialog(true)}
            autoFocus
          >
            {isConfirm
              ? isDanger
                ? 'ยืนยันการลบ'
                : 'ยืนยัน'
              : 'ตกลง'}
          </button>
        </div>
      </section>
    </div>
  );
}
