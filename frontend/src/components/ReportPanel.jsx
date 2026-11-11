import React, { useCallback, useEffect, useRef, useState } from 'react';
import { eventService } from '../api/eventService.js';
import { getAttendanceMetrics, reportCount } from '../utils/attendanceMetrics.js';
import { CheckInSources } from './BookingTools.jsx';
import './booking-tools.css';

// รายงานต่อกิจกรรมจาก GET /api/admin/events/{id}/report
export default function ReportPanel({ eventId, eventEnded = false, refreshKey = 0 }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (eventId === undefined || eventId === null) return;
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const response = await eventService.getEventReport(eventId);
      if (request === requestRef.current) setReport(response?.data ?? response ?? null);
    } catch (err) {
      if (request !== requestRef.current) return;
      setReport(null);
      setError(err?.message || 'ไม่สามารถโหลดรายงานได้');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load, refreshKey]);

  if (loading) return <p className="bt-report-note">กำลังโหลดรายงาน…</p>;

  if (error) {
    return (
      <p className="bt-report-note" role="alert">
        {error}{' '}
        <button type="button" onClick={load}>ลองอีกครั้ง</button>
      </p>
    );
  }

  if (!report) return <p className="bt-report-note" role="status">ยังไม่มีรายงานสำหรับกิจกรรมนี้</p>;

  const { activeOrders, activeSeats, checkedInSeats, notCheckedInSeats, showRate, noShowRate } = getAttendanceMetrics(report);

  const cancelled = reportCount(report.cancelledOrders);
  const capacity = reportCount(report.capacity);
  const number = new Intl.NumberFormat('th-TH');
  const tiles = [
    {
      key: 'booked', label: 'ที่นั่งที่จองแล้ว', value: activeSeats, tone: 'accent',
      sub: activeOrders == null ? null : `จาก ${number.format(activeOrders)} รายการจอง · ไม่นับที่ยกเลิก`,
      detail: cancelled ? `ยกเลิก ${number.format(cancelled)} รายการ` : null,
    },
    {
      key: 'show', label: 'อัตราเช็กอิน', value: showRate,
      sub: showRate == null ? null : `เช็กอินแล้ว ${number.format(checkedInSeats)} จาก ${number.format(activeSeats)} ที่นั่ง`,
      detail: eventEnded && noShowRate != null ? `ไม่มา ${number.format(notCheckedInSeats)} ที่นั่ง (${noShowRate})` : null,
    },
    {
      key: 'avail', label: 'ที่นั่งว่าง', value: reportCount(report.available),
      sub: capacity == null ? null : `จากทั้งหมด ${number.format(capacity)} ที่นั่ง`,
    },
  ];

  return (
    <div className="bt-summary-wrap" aria-label="รายงานจากระบบ">
      <p className="bt-report-note">ยอดสะสมของอีเวนต์นี้</p>
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{typeof tile.value === 'number' ? number.format(tile.value) : tile.value ?? '—'}</strong>
            {tile.sub && <small>{tile.sub}</small>}
            {tile.detail && <small>{tile.detail}</small>}
          </div>
        ))}
      </div>
      <CheckInSources
        staff={reportCount(report.staffCheckedIn)}
        online={reportCount(report.onlineCheckedIn)}
        unknown={reportCount(report.unknownCheckedIn)}
      />
    </div>
  );
}
