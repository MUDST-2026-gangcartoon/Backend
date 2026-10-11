import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await eventService.getAllEvents({
          page: 0,
          size: 100,
        });

        const items = Array.isArray(response)
          ? response
          : response?.items ?? [];

        if (active) {
          // Use sample cards only when the real API returns an empty list
          // and Vite is running in development mode.
          const isDevelopment = import.meta.env.DEV;
          setEvents(
            isDevelopment && items.length === 0
              ? DEMO_EVENTS
              : items
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || 'ไม่สามารถโหลดรายการอีเวนต์ได้'
          );
        }
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

  return (
    <>
      <StaffNavbar />

      <main className="page">
        <div className="crumbs">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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

        {loading && (
          <p role="status">กำลังโหลดรายการอีเวนต์...</p>
        )}

        {!loading && error && (
          <div role="alert">
            <p>โหลดรายการอีเวนต์ไม่สำเร็จ: {error}</p>
            <button
              type="button"
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
            {import.meta.env.DEV && events === DEMO_EVENTS && (
              <p role="status">
                โหมดตัวอย่างสำหรับพัฒนา Frontend — ข้อมูลนี้ไม่ใช่อีเวนต์จริง
              </p>
            )}

            <section className="event-grid">
              {events.map((ev) => {
                const category = ev.category || 'COMMUNITY';
                const isDemo = String(ev.id).startsWith('demo-');

                return (
                  <a
                    className="event-card"
                    key={ev.id}
                    href={isDemo ? '#' : `/staff/checkin/${ev.id}`}
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
                      className={`event-thumb ${String(category).toLowerCase()}`}
                    >
                      <span className="event-tag">{category}</span>
                      <span style={{ fontSize: 30 }}>
                        {ICONS[category] || '🎟️'}
                      </span>
                    </div>

                    <div className="event-body">
                      <h2 className="event-title">{ev.title}</h2>
                      <p className="event-meta">
                        {formatDate(ev.startsAt)}
                        <span className="mdot">·</span>
                        {ev.location || 'ไม่ระบุสถานที่'}
                      </p>
                    </div>

                    <span className="event-arrow">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
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
          </>
        )}
      </main>
    </>
  );
}
