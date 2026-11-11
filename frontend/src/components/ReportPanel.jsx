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

  const tiles = [
    { key: 'orders', label: 'รายการทั้งหมด', value: reportCount(report.orders), sub: 'รวมที่ยกเลิก' },
    { key: 'active', label: 'การจองที่ยังใช้ได้', value: activeOrders, tone: 'accent' },
    { key: 'cancelled', label: 'รายการยกเลิก', value: reportCount(report.cancelledOrders) },
    { key: 'participants', label: 'ที่นั่งที่จองไว้ (ไม่รวมที่ยกเลิก)', value: activeSeats },
    { key: 'in', label: 'ที่นั่งที่เช็กอินแล้ว', value: checkedInSeats },
    { key: 'not', label: 'ที่นั่งที่ยังไม่เช็กอิน', value: notCheckedInSeats },
    { key: 'cap', label: 'ความจุ', value: reportCount(report.capacity) },
    { key: 'avail', label: 'ที่นั่งว่าง', value: reportCount(report.available) },
    { key: 'show', label: 'เปอร์เซ็นต์เช็กอิน', value: showRate, sub: showRate == null ? null : `เช็กอิน ${checkedInSeats} จาก ${activeSeats} ที่นั่ง` },
    { key: 'noshow', label: 'เปอร์เซ็นต์ไม่มางาน', value: eventEnded ? noShowRate : null, sub: !eventEnded ? 'แสดงหลังจบงาน' : noShowRate == null ? null : `ไม่มา ${notCheckedInSeats} จาก ${activeSeats} ที่นั่ง` },
  ];

  return (
    <div className="bt-summary-wrap" aria-label="รายงานจากระบบ">
      <h3>สรุปการจองและเช็กอินของอีเวนต์</h3>
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{tile.value ?? '—'}</strong>
            {tile.sub && <small>{tile.sub}</small>}
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
