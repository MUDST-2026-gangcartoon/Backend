
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StaffNavbar from '../components/StaffNavbar.jsx';
import { eventService } from '../api/eventService.js';
import '../staff-shell.css';
import '../event-checkin.css';

const ICONS = {
  DESIGN: '🎨',
  TECH: '⚙️',
  CAREER: '📊',
  COMMUNITY: '👥',
};

// Development-only sample data. Never used in production.
const DEMO_EVENTS = [
  {
    id: 'demo-design',
    title: 'Creative Design Workshop',
    category: 'DESIGN',
    startsAt: '2026-10-15T09:00:00',
    location: 'ห้องประชุม A',
  },
  {
    id: 'demo-tech',
    title: 'Technology Innovation Day',
    category: 'TECH',
    startsAt: '2026-10-18T13:00:00',
    location: 'อาคาร ICT',
  },
  {
    id: 'demo-career',
    title: 'Career & Networking',
    category: 'CAREER',
    startsAt: '2026-10-20T10:00:00',
    location: 'หอประชุมมหาวิทยาลัย',
  },
];

const formatDate = (value) => {
  if (!value) return 'ไม่ระบุวันเวลา';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function EventCheckinSelectPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchText = (searchParams.get('search') || '')
    .trim()
    .toLocaleLowerCase();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError('');

        // Load every page from the backend.
        const items = await eventService.getAllEventsAcrossPages({
          size: 100,
        });

        if (!active) return;

        // Demo data is used only during development when no events exist.
        const isDevelopment = import.meta.env.DEV;

        setEvents(
          isDevelopment && items.length === 0
            ? DEMO_EVENTS
            : items
        );
      } catch (err) {
        if (!active) return;

        setError(
          err?.message || 'ไม่สามารถโหลดรายการอีเวนต์ได้'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const isShowingDemoEvents =
    import.meta.env.DEV &&
    events.length > 0 &&
    events.every((event) =>
      String(event.id).startsWith('demo-')
    );

  // Filter events using the search box in StaffNavbar.
  const filteredEvents = events.filter((ev) => {
    const searchableText = [
      ev.title,
      ev.name,
      ev.location,
      ev.category,
      ev.description,
      ev.topic,
    ]
      .filter((value) => value != null)
      .join(' ')
      .toLocaleLowerCase();

    return searchableText.includes(searchText);
  });

  return (
    <>
      <StaffNavbar />

      <main className="page">
        <div className="crumbs">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ทีมหน้างาน
          </a>
        </div>

        <div className="page-head">
          <div>
            <h1>เลือกอีเวนต์ที่จะเช็กอิน</h1>
            <p className="subtitle">
              เลือกงานก่อนเริ่มสแกน เพื่อตรวจสอบการใช้ตั๋ว
            </p>
          </div>
        </div>

        <hr className="rule" />

        {/* มือถือ: ช่องค้นหาบน navbar ถูกซ่อน จึงมีช่องค้นหาในหน้านี้แทน */}
        <label className="mobile-search">
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
            placeholder="ค้นหาชื่อ สถานที่ หรือหมวดหมู่"
            aria-label="ค้นหาอีเวนต์"
            value={searchParams.get('search') || ''}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value.trim()) {
                next.set('search', e.target.value);
              } else {
                next.delete('search');
              }
              setSearchParams(next, { replace: true });
            }}
          />
        </label>

        {loading && (
          <p role="status">
            กำลังโหลดรายการอีเวนต์...
          </p>
        )}

        {!loading && error && (
          <div role="alert">
            <p>
              โหลดรายการอีเวนต์ไม่สำเร็จ: {error}
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <p>ยังไม่มีอีเวนต์ให้เช็กอิน</p>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            {isShowingDemoEvents && (
              <p role="status">
                โหมดตัวอย่างสำหรับพัฒนา Frontend
                — ข้อมูลนี้ไม่ใช่อีเวนต์จริง
              </p>
            )}

            {searchText && (
              <p role="status">
                พบ {filteredEvents.length} อีเวนต์
                จากคำค้นหา "{searchParams.get('search')}"
              </p>
            )}

            {filteredEvents.length === 0 ? (
              <p role="status">
                ไม่พบอีเวนต์ที่ตรงกับคำค้นหา
                "{searchParams.get('search')}"
              </p>
            ) : (
              <section className="ci-grid">
                {filteredEvents.map((ev) => {
                  const category = ev.category || 'COMMUNITY';
                  const isDemo = String(ev.id).startsWith('demo-');

                  return (
                    <a
                      className="ci-card"
                      key={ev.id}
                      href={
                        isDemo
                          ? '#'
                          : `/staff/checkin/${ev.id}`
                      }
                      onClick={(e) => {
                        e.preventDefault();

                        if (isDemo) {
                          window.alert(
                            'นี่คืออีเวนต์ตัวอย่างสำหรับดู UI เท่านั้น ยังไม่สามารถเช็กอินจริงได้'
                          );
                          return;
                        }

                        navigate(`/staff/checkin/${ev.id}`);
                      }}
                    >
                      <div
                        className={`ci-thumb ${String(
                          category
                        ).toLowerCase()}`}
                      >
                        <span className="ci-tag">
                          {category}
                        </span>

                        <span className="ci-icon">
                          {ICONS[category] || '🎟️'}
                        </span>
                      </div>

                      <div className="ci-body">
                        <h2 className="ci-title">
                          {ev.title || ev.name || 'ไม่มีชื่ออีเวนต์'}
                        </h2>

                        <p className="ci-meta">
                          {formatDate(ev.startsAt)}
                          <span className="mdot">·</span>
                          {ev.location || 'ไม่ระบุสถานที่'}
                        </p>

                        <p className="ci-meta">
                          ผู้ลงทะเบียน {ev.registeredCount ?? 0} คน
                          <span className="mdot">·</span>
                          {ev.status || 'ไม่ระบุสถานะ'}
                        </p>
                      </div>

                      <span className="ci-arrow">
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12h14M13 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </a>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
