import React from 'react';
import Icon from './Icon.jsx';
import BookingTools from './BookingTools.jsx';

// Drawer รายชื่อผู้เข้าร่วมและรายงานของกิจกรรมเดียว เปิดจากปุ่มในหน้า /manage-events
export default function AttendeesDrawer({
  open,
  event,
  bookings = [],
  loading = false,
  error = '',
  mock = false,
  onRetry,
  onClose,
}) {
  if (!open || !event) return null;

  return (
    <div className="drawer-overlay-wrap">
      <div className="bg-dimmed" onClick={onClose} />
      <aside
        className="drawer attendees-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="รายชื่อผู้เข้าร่วม"
        style={{ width: 560 }}
      >
        <div className="drawer-head">
          <div>
            <div className="eyebrow">รายชื่อผู้เข้าร่วมและรายงาน</div>
            <h2 className="drawer-title">{event.name}</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} title="ปิด">
            <Icon name="close" size="1.2em" strokeWidth={2} />
          </button>
        </div>

        <div className="drawer-body">
          {mock && (
            <p className="bt-mock-note">โหมดข้อมูลจำลอง (?mock=1) — ไม่ใช่ข้อมูลจริง</p>
          )}
          <BookingTools
            bookings={bookings}
            capacity={event.max}
            loading={loading}
            error={error}
            onRetry={onRetry}
            eventName={event.name}
          />
        </div>
      </aside>
    </div>
  );
}
