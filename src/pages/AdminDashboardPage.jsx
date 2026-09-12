import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar.jsx';
import '../admin-dashboard.css';

const funnel = [
  { label: 'เข้าชมเว็บ', pct: 60 },
  { label: 'ดูรายละเอียด', pct: 5 },
  { label: 'จองบัตร', pct: 25 },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <>
      <AdminNavbar />

      <main className="dashboard-page">
        <section className="dashboard-header">
          <div className="dashboard-header-left">
            <div className="dashboard-eyebrow">ภาพรวมผู้จัดงาน</div>
            <h1>ภาพรวมที่ช่วยให้งานของคุณเดินต่อ</h1>
            <p className="dashboard-subtitle">
              ดูการเข้าชม การสนใจ และการจองจากข้อมูลจริงของ Petopia แล้วเลือกสิ่งที่ควรจัดการต่อ
            </p>
          </div>

          <button type="button" className="dashboard-event-btn" onClick={() => navigate('/manage-events')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            จัดการอีเวนต์
          </button>
        </section>

        <div className="dashboard-divider" />

        <section className="dashboard-stats">
          <article className="dashboard-stat-card dashboard-stat-highlight">
            <div className="dashboard-stat-label">การจองทั้งหมด</div>
            <div className="dashboard-stat-number">1</div>
            <div className="dashboard-stat-description">สิ่งที่ถูกจองในระบบ</div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">อีเวนต์ที่เปิดรับ</div>
            <div className="dashboard-stat-number">4</div>
            <div className="dashboard-stat-description">จากทั้งหมด 4 อีเวนต์</div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">ผู้เข้าชมไม่ซ้ำ</div>
            <div className="dashboard-stat-number">5</div>
            <div className="dashboard-stat-description">จากข้อมูลการเข้าชมที่บันทึกไว้</div>
          </article>
        </section>

        <section className="dashboard-charts">
          <article className="dashboard-chart-card dashboard-bar-card">
            <div className="dashboard-chart-header">
              <div>
                <div className="dashboard-chart-label">เส้นทางการจอง</div>
                <h2>จากการเข้าชมสู่การจอง</h2>
              </div>
              <div className="dashboard-chart-tag">ข้อมูลที่บันทึกในระบบ</div>
            </div>

            <div className="dashboard-bar-chart">
              <div className="dashboard-y-axis">
                <span>8</span>
                <span>6</span>
                <span>4</span>
                <span>2</span>
                <span>0</span>
              </div>

              <div className="dashboard-bar-area">
                {funnel.map((step) => (
                  <div className="dashboard-bar-column" key={step.label}>
                    <div className="dashboard-bar" style={{ height: `${step.pct}%` }} />
                    <div className="dashboard-bar-label">{step.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="dashboard-chart-card dashboard-donut-card">
            <div className="dashboard-chart-header">
              <div>
                <div className="dashboard-chart-label">การใช้ความจุ</div>
                <h2>ที่นั่งในอีเวนต์</h2>
              </div>
              <div className="dashboard-chart-tag">อีเวนต์ในหน้านี้</div>
            </div>

            <div className="dashboard-donut-content">
              <div className="dashboard-donut">
                <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#BAE6FD" strokeWidth="14" />
                  <circle
                    cx="65"
                    cy="65"
                    r="50"
                    fill="none"
                    stroke="#FF6B4A"
                    strokeWidth="14"
                    strokeDasharray="1 314"
                    transform="rotate(-90 65 65)"
                  />
                </svg>
                <div className="dashboard-donut-center">0%</div>
              </div>

              <div className="dashboard-donut-info">
                <div className="dashboard-seat-number">
                  1<span>/ 244</span>
                </div>
                <p>ที่นั่งถูกจองจากรายการอีเวนต์ที่กำลังแสดง</p>
              </div>
            </div>

            <div className="dashboard-legend">
              <div className="dashboard-legend-item">
                <span className="dashboard-legend-dot dashboard-booked" />
                <span>จองแล้ว</span>
              </div>
              <div className="dashboard-legend-item">
                <span className="dashboard-legend-dot dashboard-open" />
                <span>ที่ว่าง</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
