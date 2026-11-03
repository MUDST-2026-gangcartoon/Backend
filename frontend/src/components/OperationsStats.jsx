import React, { useCallback, useEffect, useState } from 'react';
import { eventService } from '../api/eventService.js';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import './booking-tools.css';

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

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

  if (!stats) return null;

  const participants = num(stats.participants);
  const checkedIn = num(stats.checkedIn);

  const tiles = [
    { key: 'orders', label: 'รายการทั้งหมด', value: num(stats.orders), sub: 'รวมที่ยกเลิก' },
    { key: 'people', label: 'ผู้ถือสิทธิ์ (คน)', value: participants, tone: 'accent' },
    { key: 'in', label: 'เช็กอินแล้ว (คน)', value: checkedIn },
    { key: 'not', label: 'ยังไม่เช็กอิน (คน)', value: Math.max(participants - checkedIn, 0) },
    { key: 'cancel', label: 'รายการยกเลิก', value: num(stats.cancelledOrders) },
  ];

  return (
    <section className="bt-summary-wrap dashboard-operations" aria-label="สถิติการดำเนินงาน">
      <h3>การดำเนินงานทุกกิจกรรม</h3>
      <div className="bt-summary">
        {tiles.map((tile) => (
          <div key={tile.key} className={`bt-tile${tile.tone ? ` ${tile.tone}` : ''}`}>
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
            {tile.sub && <small>{tile.sub}</small>}
          </div>
        ))}
      </div>
      <div className="bt-sources" aria-label="ช่องทางเช็กอิน">
        <span className="bt-sources-title">ช่องทางเช็กอิน (คน)</span>
        <span className="bt-src staff">เจ้าหน้าที่ <b>{num(stats.staffCheckedIn)}</b></span>
        <span className="bt-src online">ออนไลน์ผ่านเว็บ <b>{num(stats.onlineCheckedIn)}</b></span>
        <span className="bt-src unknown">ไม่ทราบที่มา <b>{num(stats.unknownCheckedIn)}</b></span>
      </div>
    </section>
  );
}
