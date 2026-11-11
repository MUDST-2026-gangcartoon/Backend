import React, { useCallback, useEffect, useState } from 'react';
import { eventService } from '../api/eventService.js';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import { getAttendanceMetrics, reportCount } from '../utils/attendanceMetrics.js';
import { CheckInSources } from './BookingTools.jsx';
import './booking-tools.css';

// ภาพรวมการดำเนินงานจาก GET /api/admin/analytics/operations
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

  if (loading) return <p className="bt-report-note">กำลังโหลดสถิติการดำเนินงาน…</p>;

  if (error && !stats) {
    return (
      <p className="bt-report-note" role="alert">
        {error} <button type="button" onClick={() => load()}>ลองอีกครั้ง</button>
      </p>
    );
  }

  if (!stats) return <p className="bt-report-note" role="status">ยังไม่มีข้อมูลการดำเนินงาน</p>;

  const { activeOrders, activeSeats, checkedInSeats, notCheckedInSeats, showRate } = getAttendanceMetrics(stats);
  const tiles = [
    { key: 'orders', label: 'การจองที่ยังใช้ได้', value: activeOrders },
    { key: 'people', label: 'ที่นั่งที่จองไว้ (ไม่รวมที่ยกเลิก)', value: activeSeats, tone: 'accent' },
    { key: 'in', label: 'ที่นั่งที่เช็กอินแล้ว', value: checkedInSeats },
    { key: 'not', label: 'ที่นั่งที่ยังไม่เช็กอิน', value: notCheckedInSeats },
    { key: 'cancel', label: 'รายการยกเลิก', value: reportCount(stats.cancelledOrders) },
    { key: 'show', label: 'เปอร์เซ็นต์เช็กอิน', value: showRate, sub: showRate == null ? null : `เช็กอิน ${checkedInSeats} จาก ${activeSeats} ที่นั่ง` },
  ];

  return (
    <section className="bt-summary-wrap dashboard-operations" aria-label="สถิติการดำเนินงาน">
      <h3>ภาพรวมการจองและเช็กอิน</h3>
      <p className="bt-report-note">รวมทุกอีเวนต์และทุกช่วงเวลา</p>
      {error && (
        <p className="bt-report-note" role="alert">
          อัปเดตสถิติไม่สำเร็จ กำลังแสดงข้อมูลล่าสุดที่โหลดได้{' '}
          <button type="button" onClick={() => load()}>ลองอีกครั้ง</button>
        </p>
      )}
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
        staff={reportCount(stats.staffCheckedIn)}
        online={reportCount(stats.onlineCheckedIn)}
        unknown={reportCount(stats.unknownCheckedIn)}
      />
    </section>
  );
}
