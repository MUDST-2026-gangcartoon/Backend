import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar.jsx';
import { eventService } from '../api/eventService.js';
import '../admin-dashboard.css';

const CIRCLE_RADIUS = 50;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractEvents(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.content)) return response.data.data.content;
  if (Array.isArray(response?.data?.data?.items)) return response.data.data.items;
  return null;
}

function formatNumber(value) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function getStatusLabel(status) {
  return String(status ?? '').trim().toUpperCase();
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoadState('loading');
      try {
        const response = await eventService.getAllEvents();
        const result = extractEvents(response);

        if (!result) {
          throw new Error('รูปแบบข้อมูลรายการอีเวนต์จาก API ไม่ตรงกับที่หน้า Dashboard รองรับ');
        }

        if (!cancelled) {
          setEvents(result);
          setLoadState('success');
        }
      } catch (error) {
        console.error('Failed to load dashboard events:', error);
        if (!cancelled) setLoadState('error');
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const stats = useMemo(() => {
    const bookingValues = events
      .map((event) => toNumber(event.registeredCount))
      .filter((value) => value !== null);
    const hasBookingData = bookingValues.length > 0;
    const totalBookings = bookingValues.reduce((total, value) => total + value, 0);
    const openEvents = events.filter((event) => getStatusLabel(event.status) === 'OPEN').length;

    // Only include events that provide both capacity and remaining seats in the API response.
    // This avoids presenting guessed seat-utilization figures as real data.
    const eventsWithCapacityData = events.filter((event) => {
      const capacity = toNumber(event.capacity);
      const spotsLeft = toNumber(event.spotsLeft);
      return capacity !== null && capacity >= 0 && spotsLeft !== null && spotsLeft >= 0;
    });

    const totalCapacity = eventsWithCapacityData.reduce(
      (total, event) => total + toNumber(event.capacity),
      0,
    );
    const bookedSeats = eventsWithCapacityData.reduce((total, event) => {
      const capacity = toNumber(event.capacity);
      const spotsLeft = toNumber(event.spotsLeft);
      return total + Math.max(0, Math.min(capacity, capacity - spotsLeft));
    }, 0);
    const utilization = totalCapacity > 0
      ? Math.round((bookedSeats / totalCapacity) * 100)
      : null;

    return {
      hasBookingData,
      totalBookings,
      openEvents,
      totalCapacity,
      bookedSeats,
      utilization,
      hasCapacityData: eventsWithCapacityData.length > 0,
    };
  }, [events]);

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error';
  const hasNoEvents = loadState === 'success' && events.length === 0;
  const donutOffset = stats.utilization === null
    ? CIRCLE_CIRCUMFERENCE
    : CIRCLE_CIRCUMFERENCE * (1 - stats.utilization / 100);

  return (
    <>
      <AdminNavbar />

      <main className="dashboard-page">
        <section className="dashboard-header">
          <div className="dashboard-header-left">
            <div className="dashboard-eyebrow">ภาพรวมผู้จัดงาน</div>
            <h1>ภาพรวมที่ช่วยให้งานของคุณเดินต่อ</h1>
            <p className="dashboard-subtitle">
              ดูข้อมูลอีเวนต์และการลงทะเบียนจากระบบ แล้วเลือกสิ่งที่ควรจัดการต่อ
            </p>
          </div>

          <button
            type="button"
            className="dashboard-event-btn"
            onClick={() => navigate('/manage-events')}
          >
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

        {hasError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 16px',
              marginBottom: 20,
              border: '1px solid #FECACA',
              borderRadius: 12,
              background: '#FEF2F2',
              color: '#991B1B',
            }}
          >
            <span>โหลดข้อมูล Dashboard ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</span>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {hasNoEvents && (
          <div
            role="status"
            style={{
              padding: '14px 16px',
              marginBottom: 20,
              border: '1px solid #BAE6FD',
              borderRadius: 12,
              background: '#F0F9FF',
              color: '#075985',
            }}
          >
            ยังไม่มีอีเวนต์ที่ API ส่งกลับมา
          </div>
        )}

        <section className="dashboard-stats" aria-busy={isLoading}>
          <article className="dashboard-stat-card dashboard-stat-highlight">
            <div className="dashboard-stat-label">การจอง/ลงทะเบียนรวม</div>
            <div className="dashboard-stat-number">
              {isLoading ? '…' : hasError || !stats.hasBookingData ? '—' : formatNumber(stats.totalBookings)}
            </div>
            <div className="dashboard-stat-description">
              {isLoading ? 'กำลังโหลดข้อมูล' : 'รวมจากรายการอีเวนต์ที่ API ส่งกลับมา'}
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">อีเวนต์ที่เปิดรับ</div>
            <div className="dashboard-stat-number">
              {isLoading ? '…' : hasError ? '—' : formatNumber(stats.openEvents)}
            </div>
            <div className="dashboard-stat-description">นับจากอีเวนต์ที่มีสถานะ OPEN</div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">ผู้เข้าชมไม่ซ้ำ</div>
            <div className="dashboard-stat-number">—</div>
            <div className="dashboard-stat-description">API ปัจจุบันไม่มีข้อมูลสถิติผู้เข้าชม</div>
          </article>
        </section>

        <section className="dashboard-charts">
          <article className="dashboard-chart-card dashboard-bar-card">
            <div className="dashboard-chart-header">
              <div>
                <div className="dashboard-chart-label">เส้นทางการจอง</div>
                <h2>จากการเข้าชมสู่การจอง</h2>
              </div>
              <div className="dashboard-chart-tag">ข้อมูล Analytics</div>
            </div>

            <div
              className="dashboard-bar-chart"
              role="status"
              style={{ minHeight: 190, display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}
            >
              {isLoading
                ? 'กำลังโหลดข้อมูล…'
                : 'ยังไม่มี API Analytics สำหรับแสดงเส้นทางการเข้าชมและการจอง จึงไม่แสดงตัวเลขประมาณการ'}
            </div>
          </article>

          <article className="dashboard-chart-card dashboard-donut-card">
            <div className="dashboard-chart-header">
              <div>
                <div className="dashboard-chart-label">การใช้ความจุ</div>
                <h2>ที่นั่งในอีเวนต์</h2>
              </div>
              <div className="dashboard-chart-tag">จาก Event API</div>
            </div>

            <div className="dashboard-donut-content" aria-busy={isLoading}>
              <div className="dashboard-donut">
                <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
                  <circle
                    cx="65"
                    cy="65"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="#BAE6FD"
                    strokeWidth="14"
                  />
                  {stats.hasCapacityData && !isLoading && !hasError && (
                    <circle
                      cx="65"
                      cy="65"
                      r={CIRCLE_RADIUS}
                      fill="none"
                      stroke="#FF6B4A"
                      strokeWidth="14"
                      strokeDasharray={`${CIRCLE_CIRCUMFERENCE - donutOffset} ${CIRCLE_CIRCUMFERENCE}`}
                      strokeLinecap="round"
                      transform="rotate(-90 65 65)"
                    />
                  )}
                </svg>
                <div className="dashboard-donut-center">
                  {isLoading ? '…' : hasError || stats.utilization === null ? '—' : `${stats.utilization}%`}
                </div>
              </div>

              <div className="dashboard-donut-info">
                <div className="dashboard-seat-number">
                  {isLoading
                    ? '…'
                    : hasError || !stats.hasCapacityData
                      ? '—'
                      : <>{formatNumber(stats.bookedSeats)}<span> / {formatNumber(stats.totalCapacity)}</span></>}
                </div>
                <p>
                  {stats.hasCapacityData
                    ? 'จำนวนที่นั่งที่ใช้ไปจากความจุของอีเวนต์ที่มีข้อมูลครบ'
                    : 'ยังไม่มีข้อมูลความจุและที่นั่งว่างที่เพียงพอสำหรับคำนวณ'}
                </p>
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