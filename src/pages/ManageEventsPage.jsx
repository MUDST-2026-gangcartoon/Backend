import React, { useMemo, useState } from 'react';
import Navbar from "../components/Navbar";
import AttendeesDrawer from '../components/AttendeesDrawer.jsx';
import { initialEvents } from '../data/events.js';

const CATEGORY_CLASS = {
  Design: 'design',
  Engineering: 'eng',
  สัตว์เลี้ยง: 'product',
  ไลฟ์สไตล์: 'access',
  เวิร์กช็อป: 'eng',
};

export default function ManageEventsPage() {
  const [events, setEvents] = useState(initialEvents);
  const [drawer, setDrawer] = useState({ open: false, mode: 'create', event: null });
  const [attendeesDrawer, setAttendeesDrawer] = useState({ open: false, event: null });

  const stats = useMemo(() => {
    const total = events.length;
    const open = events.filter((e) => e.seats < e.max).length;
    const totalSeats = events.reduce((s, e) => s + e.max, 0);
    const totalRegistered = events.reduce((s, e) => s + e.seats, 0);
    return { total, open, totalSeats, totalRegistered };
  }, [events]);

  const openCreateDrawer = () => setDrawer({ open: true, mode: 'create', event: null });
  const openEditDrawer = (event) => setDrawer({ open: true, mode: 'edit', event });
  const closeDrawer = () => setDrawer((d) => ({ ...d, open: false }));

  const openAttendees = (event) => setAttendeesDrawer({ open: true, event });
  const closeAttendees = () => setAttendeesDrawer((d) => ({ ...d, open: false }));

  const handleDelete = (id) => {
    if (window.confirm('ยืนยันการลบอีเวนต์นี้หรือไม่?')) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleSubmit = (form, isEdit) => {
    if (isEdit) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === form.id
            ? {
                ...e,
                name: form.name,
                desc: form.desc,
                place: form.place,
                category: form.category,
                thumbClass: CATEGORY_CLASS[form.category] || 'design',
                max: Number(form.max) || e.max,
                date: form.date || e.date,
              }
            : e
        )
      );
      alert('บันทึกการแก้ไขเรียบร้อยแล้ว!');
    } else {
      const newEvent = {
        id: String(Date.now()),
        name: form.name || 'อีเวนต์ใหม่',
        desc: form.desc,
        place: form.place,
        category: form.category,
        thumbClass: CATEGORY_CLASS[form.category] || 'design',
        dateLabel: form.date ? new Date(form.date).toLocaleDateString('th-TH') : '-',
        date: form.date,
        seats: 0,
        max: Number(form.max) || 30,
        attendees: [],
      };
      setEvents((prev) => [newEvent, ...prev]);
      alert('สร้างอีเวนต์เรียบร้อยแล้ว!');
    }
    closeDrawer();
  };

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="crumb">
          <svg width="12" height="12" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="30" cy="20" r="9" />
            <circle cx="60" cy="20" r="9" />
            <ellipse cx="45" cy="55" rx="25" ry="23" />
          </svg>
          การจัดการระบบ
        </div>

        <div className="page-head">
          <div>
            <h1>จัดการอีเวนต์</h1>
            <p className="subtitle">สร้างอีเวนต์ ตรวจสอบจำนวนที่นั่ง และดูรายชื่อผู้เข้าร่วม</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreateDrawer}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            สร้างอีเวนต์
          </button>
        </div>

        <hr className="rule" />

        <section className="stats-row">
          <div className="stat-card">
            <div className="stat-label">อีเวนต์ทั้งหมด</div>
            <div className="stat-num">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">กำลังเปิดรับสมัคร</div>
            <div className="stat-num">{stats.open}</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-label">การลงทะเบียนทั้งหมด</div>
            <div className="stat-num">
              {stats.totalRegistered}
              <span>/ {stats.totalSeats} ที่นั่ง</span>
            </div>
          </div>
        </section>

        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>อีเวนต์</th>
                  <th>วันเวลาและสถานที่</th>
                  <th>จำนวนที่นั่ง</th>
                  <th>สถานะ</th>
                  <th className="align-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const fillPct = Math.min(100, Math.round((ev.seats / ev.max) * 100));
                  const isOpen = ev.seats < ev.max;
                  return (
                    <tr key={ev.id}>
                      <td>
                        <div className="ev-cell">
                          <div className={`ev-thumb ${ev.thumbClass}`}>🐾</div>
                          <div>
                            <div className="ev-title">{ev.name}</div>
                            <div className="ev-cat">{ev.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="dt-main">{ev.dateLabel || (ev.date && new Date(ev.date).toLocaleDateString('th-TH'))}</div>
                        <div className="dt-sub">{ev.place}</div>
                      </td>
                      <td>
                        <div className="seats-num">
                          {ev.seats} / {ev.max}
                        </div>
                        <div className="seats-bar">
                          <div className="seats-fill" style={{ '--fill': `${fillPct}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className="status">
                          <span className="dot" />
                          {isOpen ? 'เปิดรับลงทะเบียน' : 'เต็มแล้ว'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="icon-btn"
                            title="ดูรายละเอียด"
                            onClick={() => openAttendees(ev)}
                          >
                            👁
                          </button>
                          <button className="icon-btn" title="แก้ไข" onClick={() => openEditDrawer(ev)}>
                            ✏️
                          </button>
                          <button
                            className="icon-btn danger"
                            title="ลบ"
                            onClick={() => handleDelete(ev.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <EventDrawer
        open={drawer.open}
        mode={drawer.mode}
        initialEvent={
          drawer.event && {
            id: drawer.event.id,
            name: drawer.event.name,
            desc: drawer.event.desc,
            place: drawer.event.place,
            category: drawer.event.category,
            date: drawer.event.date,
            max: drawer.event.max,
          }
        }
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />

      <AttendeesDrawer
        open={attendeesDrawer.open}
        eventName={attendeesDrawer.event?.name || ''}
        seatsInfo={attendeesDrawer.event ? `${attendeesDrawer.event.seats} / ${attendeesDrawer.event.max}` : ''}
        attendees={attendeesDrawer.event?.attendees || []}
        onClose={closeAttendees}
      />
    </>
  );
}
