import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventService } from '../../api/eventService';
import './UpcomingEventsPage.css';

const categories = [
  'ทุกความสนใจ',
  'เทคโนโลยี',
  'ออกแบบ',
  'อาชีพ',
  'คอมมูนิตี้',
];

const categoryValues = [
  'ALL',
  'TECH',
  'DESIGN',
  'CAREER',
  'COMMUNITY',
];

const bannerBackgrounds = {
  DESIGN: 'linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)',
  TECH: 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)',
  CAREER: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
  COMMUNITY: 'linear-gradient(135deg, #172554 0%, #3b82f6 100%)',
};

const getStatusLabel = (event) => {
  if (event.registered) {
    return 'ลงทะเบียนแล้ว';
  }

  const status = String(event.status || '').toUpperCase();

  const labels = {
    OPEN: 'เปิดรับลงทะเบียน',
    FULL: 'เต็มแล้ว',
    ENDED: 'สิ้นสุดแล้ว',
    REGISTERED: 'ลงทะเบียนแล้ว',
  };

  return labels[status] || event.status || 'ไม่ระบุสถานะ';
};

const mapEvent = (item) => {
  const date = item.startsAt ? new Date(item.startsAt) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const categoryCode = String(item.category || '').toUpperCase();

  return {
    ...item,
    statusBadge: getStatusLabel(item),
    bannerBg:
      bannerBackgrounds[categoryCode] ||
      'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    bannerText: item.title || '',
    month: validDate
      ? date.toLocaleDateString('th-TH', { month: 'short' })
      : '-',
    day: validDate
      ? date.toLocaleDateString('th-TH', { day: 'numeric' })
      : '-',
    time: validDate
      ? date.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '-',
    description: item.description || '',
    location: item.location || '-',
    seatsLeft: item.spotsLeft ?? 0,
    ticketTypes: Array.isArray(item.ticketTypes)
      ? item.ticketTypes
      : [],
  };
};

export default function UpcomingEventsPage() {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedTickets, setExpandedTickets] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const eventsSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError('');

    const timer = setTimeout(async () => {
      try {
        const response = await eventService.getAllEvents({
          page: 0,
          size: 20,
          search: searchQuery.trim() || undefined,
          category:
            activeCategory === 'ALL' ? undefined : activeCategory,
        });

        if (cancelled) return;

        // รองรับทั้ง response.items และ response.data.items
        const payload = response?.data ?? response;

        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

        setEvents(items.map(mapEvent));
        setExpandedTickets([]);
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
          setLoadError(
            error?.message || 'ไม่สามารถโหลดรายการอีเวนต์ได้'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeCategory, searchQuery, reloadKey]);

  const handleRegisterClick = (event, eventId) => {
    event.preventDefault();
    navigate(`/event-detail/${eventId}`);
  };

  const scrollToEvents = () => {
    eventsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const toggleTicketExpand = (eventId) => {
    setExpandedTickets((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const featuredEvent = events[0];

  return (
    <div className="page-wrapper">
      <Navbar onSearchChange={setSearchQuery} />

      <main className="events-home-container">
        <section className="hero-section">
          <div className="hero-text">
            <p className="hero-subtitle">
              เหตุผลดี ๆ ที่จะได้มาเจอกัน
            </p>

            <h1 className="hero-title">
              ไอเดียที่ดี
              <br />
              เริ่มต้นเมื่อเรา
              <br />
              ออกมาเจอกัน
            </h1>

            <p className="hero-desc">
              ค้นหาเวิร์กช็อป ทอล์ก และกิจกรรมชุมชนที่คัดสรรมาเพื่อคนช่างสงสัย
            </p>

            <button
              type="button"
              className="btn-all-events"
              onClick={scrollToEvents}
            >
              ดูอีเวนต์ทั้งหมด →
            </button>
          </div>

          <div className="hero-card-container">
            <div className="hero-card-content">
              <span className="hero-badge">
                {featuredEvent ? 'แนะนำ' : 'อีเวนต์'}
              </span>

              <h2 className="hero-card-title">
                {(featuredEvent?.title || 'ค้นหาอีเวนต์ที่ใช่')
                  .split('\n')
                  .map((text, index) => (
                    <React.Fragment key={index}>
                      {text}
                      <br />
                    </React.Fragment>
                  ))}
              </h2>

              <p className="hero-card-info">
                📅{' '}
                {featuredEvent
                  ? `${featuredEvent.day} ${featuredEvent.month} · ${featuredEvent.time} · ${featuredEvent.location}`
                  : 'เลือกชมอีเวนต์ที่น่าสนใจด้านล่าง'}
              </p>
            </div>

            <button
              type="button"
              className="btn-circle-arrow"
              aria-label="ดูรายละเอียดอีเวนต์แนะนำ"
              onClick={(event) => {
                if (featuredEvent) {
                  handleRegisterClick(event, featuredEvent.id);
                } else {
                  scrollToEvents();
                }
              }}
            >
              →
            </button>
          </div>
        </section>

        <section
          className="category-section"
          ref={eventsSectionRef}
        >
          <p className="category-subtitle">
            เลือกตามความสนใจ
          </p>

          <h2 className="category-title">
            เลือกตามความสนใจ
          </h2>

          <div className="filter-pills">
            {categories.map((category, index) => (
              <button
                type="button"
                key={category}
                className={`pill ${
                  activeCategory === categoryValues[index]
                    ? 'active'
                    : ''
                }`}
                aria-pressed={
                  activeCategory === categoryValues[index]
                }
                onClick={() =>
                  setActiveCategory(categoryValues[index])
                }
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <div className="gather-picks-banner">
          <div className="gather-left">
            <span className="gather-badge">
              PETOPIA PICKS
            </span>

            <h3 className="gather-title">
              อีเวนต์น่าสนใจประจำสัปดาห์
            </h3>
          </div>

          <span className="gather-arrow">→</span>
        </div>

        <section className="events-grid">
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                width: '100%',
                gridColumn: '1 / -1',
                color: '#666',
              }}
            >
              กำลังโหลดอีเวนต์...
            </div>
          ) : loadError ? (
            <div
              role="alert"
              style={{
                textAlign: 'center',
                padding: '2rem',
                width: '100%',
                gridColumn: '1 / -1',
                color: '#dc2626',
              }}
            >
              <p>
                ไม่สามารถโหลดอีเวนต์ได้: {loadError}
              </p>

              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : events.length > 0 ? (
            events.map((event) => (
              <div className="event-card" key={event.id}>
                <div
                  className="card-banner"
                  style={{ background: event.bannerBg }}
                >
                  <span className="status-badge">
                    {event.statusBadge}
                  </span>

                  <div className="banner-text">
                    {event.bannerText.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="card-body">
                  <div className="date-box">
                    <span className="date-month">
                      {event.month}
                    </span>

                    <span className="date-day">
                      {event.day}
                    </span>
                  </div>

                  <div className="card-content">
                    <h3 className="event-title">
                      {event.title}
                    </h3>

                    <p className="event-description">
                      {event.description}
                    </p>

                    <div className="meta-info">
                      <span className="meta-item">
                        🕒 {event.time}
                      </span>

                      <span className="meta-item">
                        📍 {event.location}
                      </span>
                    </div>

                    <div
                      className="ticket-toggle-container"
                      style={{
                        marginTop: '1rem',
                        borderTop: '1px solid #eee',
                        paddingTop: '0.8rem',
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={expandedTickets.includes(event.id)}
                        onClick={() =>
                          toggleTicketExpand(event.id)
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          padding: 0,
                        }}
                      >
                        {expandedTickets.includes(event.id)
                          ? 'ซ่อนประเภทบัตร ▲'
                          : 'แสดงประเภทบัตร ▼'}
                      </button>

                      {expandedTickets.includes(event.id) && (
                        <div
                          className="ticket-details"
                          style={{
                            marginTop: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                          }}
                        >
                          {event.ticketTypes.length > 0 ? (
                            event.ticketTypes.map((ticket) => (
                              <div
                                key={ticket.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  background: '#f8fafc',
                                  padding: '0.5rem',
                                  borderRadius: '4px',
                                }}
                              >
                                <span>
                                  {ticket.name} · ฿
                                  {Number(
                                    ticket.price ?? 0
                                  ).toLocaleString('th-TH')}
                                </span>

                                <span
                                  style={{
                                    color:
                                      Number(ticket.remaining ?? 0) > 0
                                        ? '#10b981'
                                        : '#ef4444',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {Number(ticket.remaining ?? 0) > 0
                                    ? `เหลือ ${ticket.remaining} ใบ`
                                    : 'บัตรหมด'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div>
                              ยังไม่มีข้อมูลประเภทบัตร
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className="card-footer"
                      style={{ marginTop: '1rem' }}
                    >
                      <span className="seats-count">
                        {event.seatsLeft} ที่นั่งเหลือ
                      </span>

                      <button
                        type="button"
                        onClick={(e) =>
                          handleRegisterClick(e, event.id)
                        }
                        className="btn-register"
                      >
                        ดูรายละเอียด / ลงทะเบียน →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                width: '100%',
                gridColumn: '1 / -1',
                color: '#666',
              }}
            >
              ไม่พบอีเวนต์ที่ตรงกับเงื่อนไข
            </div>
          )}
        </section>
      </main>
    </div>
  );
}