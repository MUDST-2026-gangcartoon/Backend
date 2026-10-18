import React from 'react';
import {
  CATEGORY_META,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  WHEN_OPTIONS,
} from '../utils/eventFilters.js';
import './event-filters.css';

// เดิมไฮไลต์คำที่ค้นหา ตอนนี้แสดงข้อความปกติ (คงชื่อไว้เพื่อให้หน้าอื่นที่เรียกใช้ไม่ต้องแก้)
export function Highlight({ text }) {
  return String(text ?? '');
}

export default function EventFilterBar({
  filters,
  setFilter,
  clear,
  activeCount,
  counts,
  total,
  shown,
  searchPlaceholder,
  unit = 'อีเวนต์',
}) {
  const hasQuery = filters.q.trim() !== '';

  return (
    <section className="ef-bar" aria-label="ค้นหาและกรองอีเวนต์">
      {/* มือถือ: ช่องค้นหาบน navbar ถูกซ่อน จึงมีช่องค้นหาในหน้าแทน (ใช้ค่าเดียวกัน) */}
      <label className="ef-search">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={filters.q}
          placeholder={searchPlaceholder}
          aria-label="ค้นหา"
          onChange={(event) => setFilter('q', event.target.value)}
        />
      </label>

      <div className="ef-row" role="group" aria-label="กรองตามสถานะ">
        {STATUS_OPTIONS.map((option) => {
          const count = counts?.status?.[option.key] ?? 0;
          const isActive = filters.status === option.key;

          return (
            <button
              key={option.key}
              type="button"
              className={`ef-chip${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              disabled={!isActive && count === 0}
              onClick={() => setFilter('status', option.key)}
            >
              {option.label}
              <span className="ef-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="ef-row" role="group" aria-label="กรองตามหมวดหมู่">
        <button
          type="button"
          className={`ef-chip${filters.cat === 'all' ? ' is-active' : ''}`}
          aria-pressed={filters.cat === 'all'}
          onClick={() => setFilter('cat', 'all')}
        >
          ทุกหมวด
        </button>

        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const count = counts?.cat?.[key] ?? 0;
          const isActive = filters.cat === key;

          return (
            <button
              key={key}
              type="button"
              className={`ef-chip${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              disabled={!isActive && count === 0}
              onClick={() => setFilter('cat', isActive ? 'all' : key)}
            >
              <span
                className="ef-dot"
                style={{ background: meta.color }}
                aria-hidden="true"
              />
              {meta.label}
              <span className="ef-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="ef-selects">
        <label>
          <span>ช่วงเวลา</span>
          <select
            value={filters.when}
            onChange={(event) => setFilter('when', event.target.value)}
          >
            {WHEN_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>เรียงตาม</span>
          <select
            value={filters.sort}
            onChange={(event) => setFilter('sort', event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ef-summary" role="status" aria-live="polite">
        <span>
          พบ <strong>{shown}</strong> จาก {total} {unit}
        </span>

        {hasQuery && (
          <button
            type="button"
            className="ef-pill"
            onClick={() => setFilter('q', '')}
            aria-label={`ล้างคำค้นหา ${filters.q}`}
          >
            “{filters.q}” ✕
          </button>
        )}

        {activeCount > 0 && (
          <button type="button" className="ef-clear" onClick={clear}>
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>
    </section>
  );
}