import React, { useMemo, useState } from 'react';
import {
  SOURCE_FILTERS,
  SOURCE_LABEL,
  STATUS_FILTERS,
  STATUS_LABEL,
  bookingsToCsv,
  filterBookings,
  formatDateTime,
  formatTimeOnly,
  normalizeBookings,
  summarizeBookings,
} from '../utils/bookingModel.js';
import { downloadTextFile, safeFileName } from '../utils/attendeeExport.js';
import './booking-tools.css';

// การ์ดสรุป: แยกจำนวน "รายการจอง" กับ "จำนวนคน"
export function BookingSummary({ summary }) {
  const tiles = [
    { key: 'bookings', label: 'รายการจอง', value: summary.bookings, tone: 'accent' },
    { key: 'people', label: 'จำนวนคน', value: summary.people },
    { key: 'in', label: 'เช็กอินแล้ว (คน)', value: summary.checkedInPeople },
    { key: 'pending', label: 'ยังไม่มา (คน)', value: summary.pendingPeople },
    {
      key: 'cancel',
      label: 'ยกเลิก',
      value: summary.cancelledBookings,
      sub: `${summary.cancelledPeople} คน`,
    },
    { key: 'left', label: 'ที่นั่งว่าง', value: summary.seatsLeft ?? '-' },
  ];

  const { staff, online, unknown } = summary.bySource;

  return (
    <div className="bt-summary-wrap">
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
        <span className="bt-src staff">เจ้าหน้าที่ <b>{staff}</b></span>
        <span className="bt-src online">ออนไลน์ผ่านเว็บ <b>{online}</b></span>
        <span className="bt-src unknown">ไม่ทราบที่มา <b>{unknown}</b></span>
      </div>
    </div>
  );
}

function BookingRow({ row, onPickCode }) {
  const [open, setOpen] = useState(false);
  const checkinTime = formatTimeOnly(row.checkedInAt);

  return (
    <li className={`bt-row is-${row.status}`}>
      <div className="bt-avatar" aria-hidden="true">{row.name.charAt(0)}</div>

      <div className="bt-info">
        <div className="bt-name">
          {row.name}
          {row.isGroup && <span className="bt-group">กลุ่ม {row.people} คน</span>}
        </div>
        {row.email && <div className="bt-sub">{row.email}</div>}
        {row.ticketType && <div className="bt-sub">{row.ticketType}</div>}

        {row.codes.length > 0 && (
          <div className="bt-codes">
            {(open ? row.codes : row.codes.slice(0, 1)).map((code) =>
              onPickCode && row.status === 'pending' ? (
                <button
                  key={code}
                  type="button"
                  className="bt-code pick"
                  title="นำรหัสนี้ไปใส่ในช่องเช็กอิน"
                  onClick={() => onPickCode(code)}
                >
                  {code}
                </button>
              ) : (
                <span key={code} className="bt-code">{code}</span>
              ),
            )}
            {row.codes.length > 1 && (
              <button type="button" className="bt-more" onClick={() => setOpen((v) => !v)}>
                {open ? 'ซ่อนรหัส' : `ดูทั้ง ${row.codes.length} รหัส`}
              </button>
            )}
          </div>
        )}

        <div className="bt-sub">
          จองเมื่อ {formatDateTime(row.registeredAt) || '-'}
          {row.status === 'cancelled' && row.cancelledAt
            ? ` · ยกเลิกเมื่อ ${formatDateTime(row.cancelledAt)}`
            : ''}
        </div>
      </div>

      <div className="bt-status">
        <span className={`bt-chip ${row.status}`}>{STATUS_LABEL[row.status]}</span>
        {row.status === 'checkedin' && (
          <>
            <span className={`bt-chip src ${row.source || 'unknown'}`}>
              {SOURCE_LABEL[row.source || 'unknown']}
            </span>
            <span className="bt-sub">
              {checkinTime || 'ไม่ทราบเวลา'}
              {row.checkedInBy ? ` · ${row.checkedInBy}` : ''}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

// แผงรวม: สรุป + ค้นหา/กรอง + รายการ + ดาวน์โหลด CSV ตามตัวกรอง
export default function BookingTools({
  bookings = [],
  capacity = null,
  loading = false,
  error = '',
  onRetry,
  eventName = '',
  initialSearch = '',
  onPickCode,
  showSummary = true,
}) {
  const [q, setQ] = useState(initialSearch);
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');

  const rows = useMemo(
    () =>
      normalizeBookings(bookings).sort(
        (a, b) =>
          new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime(),
      ),
    [bookings],
  );
  const summary = useMemo(() => summarizeBookings(rows, capacity), [rows, capacity]);
  const visible = useMemo(
    () => filterBookings(rows, { q, status, source }),
    [rows, q, status, source],
  );

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    checkedin: rows.filter((r) => r.status === 'checkedin').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  };

  const hasFilter = q.trim() !== '' || status !== 'all' || source !== 'all';
  const clearFilters = () => {
    setQ('');
    setStatus('all');
    setSource('all');
  };

  const handleCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `รายชื่อ-${safeFileName(eventName)}-${date}.csv`,
      bookingsToCsv(visible),
    );
  };

  if (loading) {
    return <p className="bt-empty" role="status">กำลังโหลดรายการจอง...</p>;
  }

  if (error) {
    return (
      <div className="bt-empty bt-error" role="alert">
        <p>โหลดรายการจองไม่สำเร็จ: {error}</p>
        {onRetry && (
          <button type="button" className="bt-btn" onClick={onRetry}>
            ลองใหม่
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="booking-tools">
      {showSummary && <BookingSummary summary={summary} />}

      <div className="bt-toolbar">
        <input
          type="search"
          className="bt-search"
          placeholder="ค้นหาชื่อ อีเมล หรือรหัสบัตร"
          aria-label="ค้นหารายการจอง"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="bt-filters" role="group" aria-label="กรองตามสถานะ">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`bt-filter${status === item.key ? ' is-active' : ''}`}
              aria-pressed={status === item.key}
              onClick={() => setStatus(item.key)}
            >
              {item.label} ({counts[item.key]})
            </button>
          ))}
        </div>

        <label className="bt-select">
          <span>ที่มาของการเช็กอิน</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCE_FILTERS.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </label>

        <div className="bt-actions">
          <span className="bt-count" role="status">
            แสดง {visible.length} จาก {rows.length} รายการ
          </span>
          {hasFilter && (
            <button type="button" className="bt-link" onClick={clearFilters}>
              ล้างตัวกรอง
            </button>
          )}
          <button
            type="button"
            className="bt-btn"
            onClick={handleCsv}
            disabled={visible.length === 0}
          >
            ดาวน์โหลด CSV{hasFilter ? ' (ตามตัวกรอง)' : ''}
          </button>
        </div>
      </div>

      <ul className="bt-list">
        {visible.map((row) => (
          <BookingRow key={row.key} row={row} onPickCode={onPickCode} />
        ))}
        {visible.length === 0 && (
          <li className="bt-empty">
            {rows.length === 0 ? 'ยังไม่มีรายการจอง' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
          </li>
        )}
      </ul>
    </div>
  );
}
