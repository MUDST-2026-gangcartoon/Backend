import React, { useMemo, useState } from 'react';
import Navbar from "../components/Navbar";
import { initialEvents } from '../data/events.js';
import '../registrant-list.css';

export default function RegistrantListPage() {
  const [events] = useState(initialEvents);

  const rows = useMemo(
    () =>
      events.flatMap((ev) =>
        ev.attendees.map((a) => ({ ...a, eventName: ev.name, eventId: ev.id }))
      ),
    [events]
  );

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <div className="header-section">
          <div className="subtitle">การจัดการระบบ</div>
          <h1 className="title">ผู้ลงทะเบียนทั้งหมด</h1>
          <p className="desc">รายชื่อผู้ลงทะเบียนจากทุกอีเวนต์ในระบบ</p>
        </div>

        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-num">{rows.length}</span>
            <span className="stat-label">ผู้ลงทะเบียนทั้งหมด</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{events.length}</span>
            <span className="stat-label">อีเวนต์ทั้งหมด</span>
          </div>
        </div>

        <div className="table-container">
          <div className="table-row header">
            <div>ชื่อ</div>
            <div>อีเมล</div>
            <div>อีเวนต์</div>
            <div>เวลาลงทะเบียน</div>
            <div />
          </div>
          {rows.map((r) => (
            <div className="table-row" key={`${r.eventId}-${r.email}`}>
              <div className="event-info">
                <div className="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }}>
                  {r.name.charAt(0)}
                </div>
                <span className="user-name">{r.name}</span>
              </div>
              <div className="user-email">{r.email}</div>
              <div className="event-title" style={{ fontSize: '0.9rem' }}>
                {r.eventName}
              </div>
              <div className="event-sub">{r.registeredAt}</div>
              <div />
            </div>
          ))}
          {rows.length === 0 && (
            <div className="table-row">
              <div style={{ color: 'var(--muted)' }}>ยังไม่มีผู้ลงทะเบียนในระบบ</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
