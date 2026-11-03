import React, { useCallback, useEffect, useState } from 'react';
import { eventService } from '../api/eventService.js';
import './booking-tools.css';

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// รายงานต่อกิจกรรมจาก GET /api/admin/events/{id}/report
// orders = รายการทั้งหมด (รวมยกเลิก), activeOrders = รายการถือสิทธิ์ ไม่เทียบคนละฐานกัน
export default function ReportPanel({ eventId, refreshKey = 0 }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (eventId === undefined || eventId === null) return;
    setLoading(true);
    setError('');
    try {
      const response = await eventService.getEventReport(eventId);
      setReport(response?.data ?? response ?? null);
    } catch (err) {
      setReport(null);
      setError(err?.message || 'ไม่สามารถโหลดรายงานได้');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
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

  if (!report) return null;

  const tiles = [
    { key: 'orders', label: 'รายการทั้งหมด', value: num(report.orders), sub: 'รวมที่ยกเลิก' },
    { key: 'active', label: 'รายการถือสิทธิ์', value: num(report.activeOrders), tone: 'accent' },
    { key: 'cancelled', label: 'รายการยกเลิก', value: num(report.cancelledOrders) },
    { key: 'participants', label: 'ผู้เข้าร่วม (คน)', value: num(report.participants) },
    { key: 'in', label: 'เช็กอินแล้ว (คน)', value: num(report.checkedIn) },
    { key: 'not', label: 'ยังไม่เช็กอิน (คน)', value: num(report.notCheckedIn) },
    { key: 'cap', label: 'ความจุ', value: num(report.capacity) },
    { key: 'avail', label: 'ที่นั่งว่าง', value: num(report.available) },
  ];

  return (
    <div className="bt-summary-wrap" aria-label="รายงานจากระบบ">
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
            {tile.sub && <small>{tile.sub}</small>}
          </div>
        ))}
      </div>
      <div className="bt-sources" aria-label="ช่องทางเช็กอินจากรายงาน">
        <span className="bt-sources-title">ช่องทางเช็กอิน (คน)</span>
        <span className="bt-src staff">เจ้าหน้าที่ <b>{num(report.staffCheckedIn)}</b></span>
        <span className="bt-src online">ออนไลน์ผ่านเว็บ <b>{num(report.onlineCheckedIn)}</b></span>
        <span className="bt-src unknown">ไม่ทราบที่มา <b>{num(report.unknownCheckedIn)}</b></span>
      </div>
    </div>
  );
}
