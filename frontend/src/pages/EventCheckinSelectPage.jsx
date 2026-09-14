import React from 'react';
import { useNavigate } from 'react-router-dom';
import StaffNavbar from '../components/StaffNavbar.jsx';
import { checkinEvents } from '../data/checkinEvents.js';
import '../staff-shell.css';
import '../event-checkin.css';

const ICONS = {
  'Design': '🎨',
  'Engineering': '⚙️',
  'Product Night': '📊',
  'Accessibility': '♿',
};

export default function EventCheckinSelectPage() {
  const navigate = useNavigate();

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
            <p className="subtitle">เลือกงานก่อนเริ่มสแกน เพื่อป้องกันการใช้ตั๋วผิดงาน</p>
          </div>
        </div>

        <hr className="rule" />

        <section className="event-grid">
          {checkinEvents.map((ev) => (
            <a
              className="event-card"
              key={ev.id}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/staff/checkin/${ev.id}`);
              }}
            >
              <div className={`event-thumb ${ev.thumbClass}`}>
                <span className="event-tag">{ev.tag}</span>
                <span style={{ fontSize: 30 }}>{ICONS[ev.tag] || '🐾'}</span>
              </div>
              <div className="event-body">
                <h2 className="event-title">{ev.name}</h2>
                <p className="event-meta">
                  {ev.dateLabel}
                  <span className="mdot">·</span>
                  {ev.place}
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
          ))}
        </section>
      </main>
    </>
  );
}
