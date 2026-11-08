import React, { useCallback, useEffect, useState } from 'react';
import { eventService } from '../api/eventService.js';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import { getAttendanceMetrics, reportCount } from '../utils/attendanceMetrics.js';
import './booking-tools.css';

// ภาพรวมการดำเนินงานจาก GET /api/admin/analytics/operations
// ถือสิทธิ์ใช้ participants; ยังไม่เช็กอิน = participants − checkedIn
export default function OperationsStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await eventService.getOperationsStats();
      setStats(response?.data ?? response ?? null);
      setError('');
    } catch (err) {
      if (!silent) setStats(null);
      setError(err?.message || 'ไม่สามารถโหลดสถิติการดำเนินงานได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(() => load(true), { intervalMs: 30000 });

  if (loading) return <p className="bt-mock-note">กำลังโหลดสถิติการดำเนินงาน…</p>;

  if (error && !stats) {
    return (
      <p className="bt-mock-note" role="alert">
        {error} <button type="button" onClick={() => load()}>ลองอีกครั้ง</button>
      </p>
    );
  }

  if (!stats) return <p className="bt-mock-note" role="status">ยังไม่มีข้อมูลการดำเนินงาน</p>;

  const { activeOrders, activeSeats, checkedInSeats, notCheckedInSeats, showRate } = getAttendanceMetrics(stats);
  const tiles = [
    { key: 'orders', label: 'รายการจองที่ถือสิทธิ์', value: activeOrders },
    { key: 'people', label: 'ที่นั่งที่ถือสิทธิ์', value: activeSeats, tone: 'accent' },
    { key: 'in', label: 'เช็กอินแล้ว (ที่นั่ง)', value: checkedInSeats },
    { key: 'not', label: 'ยังไม่เช็กอิน (ที่นั่ง)', value: notCheckedInSeats },
    { key: 'cancel', label: 'รายการยกเลิก', value: reportCount(stats.cancelledOrders) },
    { key: 'show', label: 'Show rate', value: showRate, sub: 'ที่นั่งที่เช็กอิน ÷ ที่นั่งที่ถือสิทธิ์' },
  ];

  return (
    <section className="bt-summary-wrap dashboard-operations" aria-label="สถิติการดำเนินงาน">
      <h3>การดำเนินงานทุกกิจกรรม</h3>
      <p className="bt-mock-note">ข้อมูลรวมทุกช่วงเวลา</p>
      {error && (
        <p className="bt-mock-note" role="alert">
          อัปเดตสถิติไม่สำเร็จ กำลังแสดงข้อมูลล่าสุดที่โหลดได้{' '}
          <button type="button" onClick={() => load()}>ลองอีกครั้ง</button>
        </p>
      )}
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{tile.value ?? 'N/A'}</strong>
            {tile.sub && <small>{tile.sub}</small>}
          </div>
        ))}
      </div>
      <div className="bt-sources" aria-label="ช่องทางเช็กอิน">
        <span className="bt-sources-title">ช่องทางเช็กอิน (ที่นั่ง)</span>
        <span className="bt-src staff">เจ้าหน้าที่ <b>{reportCount(stats.staffCheckedIn) ?? '—'}</b></span>
        <span className="bt-src online">ออนไลน์ผ่านเว็บ <b>{reportCount(stats.onlineCheckedIn) ?? '—'}</b></span>
        <span className="bt-src unknown">ไม่ทราบที่มา <b>{reportCount(stats.unknownCheckedIn) ?? '—'}</b></span>
      </div>
    </section>
  );
}
