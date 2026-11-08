import React, { useCallback, useEffect, useRef, useState } from 'react';
import { eventService } from '../api/eventService.js';
import { getAttendanceMetrics, reportCount } from '../utils/attendanceMetrics.js';
import './booking-tools.css';

// รายงานต่อกิจกรรมจาก GET /api/admin/events/{id}/report
// orders = รายการทั้งหมด (รวมยกเลิก), activeOrders = รายการถือสิทธิ์ ไม่เทียบคนละฐานกัน
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

  if (loading) return <p className="bt-mock-note">กำลังโหลดรายงาน…</p>;

  if (error) {
    return (
      <p className="bt-mock-note" role="alert">
        {error}{' '}
        <button type="button" onClick={load}>ลองอีกครั้ง</button>
      </p>
    );
  }

  if (!report) return <p className="bt-mock-note" role="status">ยังไม่มีรายงานสำหรับกิจกรรมนี้</p>;

  const { activeOrders, activeSeats, checkedInSeats, notCheckedInSeats, showRate, noShowRate } = getAttendanceMetrics(report);

  const tiles = [
    { key: 'orders', label: 'รายการทั้งหมด', value: reportCount(report.orders), sub: 'รวมที่ยกเลิก' },
    { key: 'active', label: 'รายการถือสิทธิ์', value: activeOrders, tone: 'accent' },
    { key: 'cancelled', label: 'รายการยกเลิก', value: reportCount(report.cancelledOrders) },
    { key: 'participants', label: 'ที่นั่งที่ถือสิทธิ์', value: activeSeats },
    { key: 'in', label: 'เช็กอินแล้ว (ที่นั่ง)', value: checkedInSeats },
    { key: 'not', label: 'ยังไม่เช็กอิน (ที่นั่ง)', value: notCheckedInSeats },
    { key: 'cap', label: 'ความจุ', value: reportCount(report.capacity) },
    { key: 'avail', label: 'ที่นั่งว่าง', value: reportCount(report.available) },
    { key: 'show', label: 'Show rate', value: showRate, sub: 'ที่นั่งที่เช็กอิน ÷ ที่นั่งที่ถือสิทธิ์' },
    { key: 'noshow', label: 'No-show rate', value: eventEnded ? noShowRate : null, sub: eventEnded ? 'ที่นั่งที่ไม่มา ÷ ที่นั่งที่ถือสิทธิ์' : 'แสดงหลังจบกิจกรรม' },
  ];

  return (
    <div className="bt-summary-wrap" aria-label="รายงานจากระบบ">
      <p className="bt-mock-note">รายงานกิจกรรมที่เลือก · รวมทุกช่วงเวลาของกิจกรรม</p>
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{tile.value ?? 'N/A'}</strong>
            {tile.sub && <small>{tile.sub}</small>}
          </div>
        ))}
      </div>
      <div className="bt-sources" aria-label="ช่องทางเช็กอินจากรายงาน">
        <span className="bt-sources-title">ช่องทางเช็กอิน (ที่นั่ง)</span>
        <span className="bt-src staff">เจ้าหน้าที่ <b>{reportCount(report.staffCheckedIn) ?? '—'}</b></span>
        <span className="bt-src online">ออนไลน์ผ่านเว็บ <b>{reportCount(report.onlineCheckedIn) ?? '—'}</b></span>
        <span className="bt-src unknown">ไม่ทราบที่มา <b>{reportCount(report.unknownCheckedIn) ?? '—'}</b></span>
      </div>
    </div>
  );
}
