import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar.jsx';
import EventAttendeesPanel from '../components/EventAttendeesPanel.jsx';
import EventFilterBar, { Highlight } from '../components/EventFilterBar.jsx';
import { useEventFilters } from '../hooks/useEventFilters.js';
import {
  applyEventFilters,
  getFacetCounts,
  matchesTokens,
  sortEvents,
} from '../utils/eventFilters.js';
import { eventService } from '../api/eventService.js';
import '../admin-dashboard.css';

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

function extractAnalytics(response) {
  const candidates = [
    response,
    response?.data,
    response?.data?.data,
  ];

  return candidates.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (
        'totalRegistrations' in item ||
        'totalEvents' in item ||
        'totalOpenEvents' in item ||
        'siteViews' in item ||
        'eventDetailViews' in item ||
        'uniqueVisitors' in item
      ),
  ) ?? null;
}

function formatNumber(value) {
  return new Intl.NumberFormat('th-TH').format(value);
}

function formatEventDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'ยังไม่ระบุวันเวลา';

  return `${date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} ${date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })} น.`;
}

function getStatusLabel(status) {
  return String(status ?? '').trim().toUpperCase();
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoadState, setAnalyticsLoadState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoadState('loading');

      try {
        const response = await eventService.getAllEventsAcrossPages({
          size: 20,
        });
        const result = extractEvents(response);

        if (!result) {
          throw new Error(
            'รูปแบบข้อมูลรายการอีเวนต์จาก API ไม่ตรงกับที่หน้า Dashboard รองรับ',
          );
        }

        if (!cancelled) {
          setEvents(result);
          setLoadState('success');
        }
      } catch (error) {
        console.error('Failed to load dashboard events:', error);

        if (!cancelled) {
          setLoadState('error');
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoadState('loading');

      try {
        const response = await eventService.getAdminStats();
        const result = extractAnalytics(response);

        if (!result) {
          throw new Error('รูปแบบข้อมูล Analytics API ไม่ถูกต้อง');
        }

        if (!cancelled) {
          setAnalytics(result);
          setAnalyticsLoadState('success');
        }
      } catch (error) {
        console.error('Failed to load dashboard analytics:', error);

        if (!cancelled) {
          setAnalytics(null);
          setAnalyticsLoadState('error');
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const stats = useMemo(() => {
    const bookingValues = events
      .map((event) => toNumber(event.registeredCount))
      .filter((value) => value !== null);

    const hasBookingData = bookingValues.length > 0;
    const totalBookings = bookingValues.reduce(
      (total, value) => total + value,
      0,
    );

    const openEvents = events.filter(
      (event) => getStatusLabel(event.status) === 'OPEN',
    ).length;

    const eventsWithCapacityData = events.filter((event) => {
      const capacity = toNumber(event.capacity);
      const spotsLeft = toNumber(event.spotsLeft);

      return (
        capacity !== null &&
        capacity >= 0 &&
        spotsLeft !== null &&
        spotsLeft >= 0
      );
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

    const utilization =
      totalCapacity > 0
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

  const analyticsStats = useMemo(() => {
    const totalRegistrations = toNumber(analytics?.totalRegistrations);
    const totalOpenEvents = toNumber(analytics?.totalOpenEvents);
    const uniqueVisitors = toNumber(analytics?.uniqueVisitors);
    const siteViews = toNumber(analytics?.siteViews);
    const eventDetailViews = toNumber(analytics?.eventDetailViews);

    return {
      totalRegistrations,
      totalOpenEvents,
      uniqueVisitors,
      siteViews,
      eventDetailViews,
    };
  }, [analytics]);

  // ---- ค้นหา/กรอง ----
  const { filters, setFilter, clear, activeCount } = useEventFilters();
  const [allAttendees, setAllAttendees] = useState({});
  const [indexLoading, setIndexLoading] = useState(false);
  const [focusPerson, setFocusPerson] = useState('');
  const indexStarted = useRef(false);

  const needsPersonIndex = filters.q.trim().length >= 2;

  // โหลดรายชื่อผู้ลงทะเบียนของทุกอีเวนต์ "ครั้งเดียว" เมื่อเริ่มพิมพ์ค้นหา
  // เพื่อให้ค้นหาชื่อคนข้ามอีเวนต์ได้ (ไม่โหลดถ้าไม่มีการค้นหา)
  useEffect(() => {
    if (!needsPersonIndex || indexStarted.current || events.length === 0) {
      return;
    }

    indexStarted.current = true;
    setIndexLoading(true);

    Promise.allSettled(
      events.map((event) => eventService.getEventAttendees(event.id)),
    ).then((results) => {
      const map = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          map[events[index].id] = extractEvents(result.value) ?? [];
        }
      });
      setAllAttendees(map);
      setIndexLoading(false);
    });
  }, [needsPersonIndex, events]);

  // ข้อความของผู้ลงทะเบียน ใช้ให้อีเวนต์ "ติดผล" เมื่อค้นเจอชื่อคนในอีเวนต์นั้น
  const extraText = useCallback(
    (event) =>
      (allAttendees[event.id] || [])
        .map((a) =>
          [a.name || a.attendeeName, a.email, a.ticketCode].join(' '),
        )
        .join(' '),
    [allAttendees],
  );

  const filteredEvents = useMemo(
    () =>
      sortEvents(
        applyEventFilters(events, filters, { extraText }),
        filters.sort,
      ),
    [events, filters, extraText],
  );

  const facetCounts = useMemo(
    () => getFacetCounts(events, filters, { extraText }),
    [events, filters, extraText],
  );

  // รายชื่อคนที่ตรงกับคำค้น (ข้ามทุกอีเวนต์)
  const personMatches = useMemo(() => {
    if (!needsPersonIndex) return [];

    const found = [];
    events.forEach((event) => {
      (allAttendees[event.id] || []).forEach((a, index) => {
        const name = a.name || a.attendeeName || '';
        if (!matchesTokens([name, a.email, a.ticketCode].join(' '), filters.q)) {
          return;
        }

        found.push({
          key: `${event.id}-${a.id ?? a.registrationId ?? index}`,
          name: name || 'ไม่ระบุชื่อ',
          email: a.email || '',
          eventId: event.id,
          eventName: event.title || event.name || '',
        });
      });
    });

    return found;
  }, [allAttendees, events, filters.q, needsPersonIndex]);

  // อีเวนต์ที่เลือกดูรายละเอียด (อ่านจาก ?event= ได้ เพื่อให้ลิงก์จากหน้าจัดการอีเวนต์เปิดตรงอีเวนต์นั้น)
  const requestedEventId = searchParams.get('event');
  const selectedEvent =
    filteredEvents.find((event) => String(event.id) === requestedEventId) ??
    filteredEvents[0] ??
    null;
  const selectedEventId = selectedEvent?.id ?? null;

  useEffect(() => {
    if (selectedEventId === null) {
      setAttendees([]);
      return undefined;
    }

    let cancelled = false;
    setAttendeesLoading(true);
    setAttendeesError('');
    setAttendees([]);

    eventService
      .getEventAttendees(selectedEventId)
      .then((response) => {
        if (cancelled) return;
        setAttendees(extractEvents(response) ?? []);
      })
      .catch((error) => {
        if (cancelled) return;
        setAttendeesError(
          error?.message || 'ไม่สามารถโหลดรายชื่อผู้ลงทะเบียนได้',
        );
      })
      .finally(() => {
        if (!cancelled) setAttendeesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEventId]);

  const selectEvent = (id, person = '') => {
    const next = new URLSearchParams(searchParams);
    next.set('event', String(id));
    setSearchParams(next, { replace: true });
    setFocusPerson(person);
  };

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error';
  const hasNoEvents = loadState === 'success' && events.length === 0;

  const isAnalyticsLoading = analyticsLoadState === 'loading';
  const hasAnalyticsError = analyticsLoadState === 'error';

  const siteViews = analyticsStats.siteViews;
  const eventDetailViews = analyticsStats.eventDetailViews;
  const maxViews = Math.max(siteViews ?? 0, eventDetailViews ?? 0, 1);

  return (
    <>
      <AdminNavbar />

      <main className="dashboard-page">
        <section className="dashboard-header">
          <div className="dashboard-header-left">
            <div className="dashboard-eyebrow">ภาพรวมผู้จัดงาน</div>
            <h1>ภาพรวมที่ช่วยให้งานของคุณเดินต่อ</h1>
            <p className="dashboard-subtitle">
              ดูข้อมูลอีเวนต์และการลงทะเบียนจากระบบ
              แล้วเลือกสิ่งที่ควรจัดการต่อ
            </p>
          </div>

          <button
            type="button"
            className="dashboard-event-btn"
            onClick={() => navigate('/manage-events')}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 20h9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
            <span>
              โหลดข้อมูลอีเวนต์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง
            </span>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {hasAnalyticsError && (
          <div
            role="status"
            style={{
              padding: '12px 16px',
              marginBottom: 20,
              border: '1px solid #FDE68A',
              borderRadius: 12,
              background: '#FFFBEB',
              color: '#92400E',
            }}
          >
            โหลดข้อมูล Analytics ไม่สำเร็จ
            กรุณาตรวจสอบ API และสิทธิ์การเข้าถึง
            <button
              type="button"
              style={{ marginLeft: 12 }}
              onClick={() => setRetryCount((count) => count + 1)}
            >
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
            <div className="dashboard-stat-label">
              การจอง/ลงทะเบียนรวม
            </div>
            <div className="dashboard-stat-number">
              {isAnalyticsLoading
                ? '…'
                : analyticsStats.totalRegistrations !== null
                  ? formatNumber(analyticsStats.totalRegistrations)
                  : isLoading
                    ? '…'
                    : hasError || !stats.hasBookingData
                      ? '—'
                      : formatNumber(stats.totalBookings)}
            </div>
            <div className="dashboard-stat-description">
              {analyticsStats.totalRegistrations !== null
                ? 'ข้อมูลจาก Analytics API'
                : 'แสดงข้อมูลจาก Event API เมื่อไม่มีสถิติจาก Analytics'}
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">อีเวนต์ที่เปิดรับ</div>
            <div className="dashboard-stat-number">
              {isAnalyticsLoading
                ? '…'
                : analyticsStats.totalOpenEvents !== null
                  ? formatNumber(analyticsStats.totalOpenEvents)
                  : isLoading
                    ? '…'
                    : hasError
                      ? '—'
                      : formatNumber(stats.openEvents)}
            </div>
            <div className="dashboard-stat-description">
              จำนวนอีเวนต์ที่เปิดรับลงทะเบียน
            </div>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-label">ผู้เข้าชมไม่ซ้ำ</div>
            <div className="dashboard-stat-number">
              {isAnalyticsLoading
                ? '…'
                : analyticsStats.uniqueVisitors === null
                  ? '—'
                  : formatNumber(analyticsStats.uniqueVisitors)}
            </div>
            <div className="dashboard-stat-description">
              {hasAnalyticsError
                ? 'ไม่สามารถโหลดสถิติผู้เข้าชมได้'
                : 'ข้อมูลจาก Analytics API'}
            </div>
          </article>
        </section>

        <section className="dashboard-charts">
          <article className="dashboard-chart-card dashboard-bar-card">
            <div className="dashboard-chart-header">
              <div>
                <div className="dashboard-chart-label">เส้นทางการเข้าชม</div>
                <h2>การเข้าชมเว็บไซต์และหน้าอีเวนต์</h2>
              </div>
              <div className="dashboard-chart-tag">ข้อมูล Analytics</div>
            </div>

            <div
              className="dashboard-bar-chart"
              aria-busy={isAnalyticsLoading}
              style={{
                minHeight: 190,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 22,
              }}
            >
              {isAnalyticsLoading ? (
                <p role="status">กำลังโหลดข้อมูล Analytics…</p>
              ) : hasAnalyticsError ? (
                <p role="status">
                  ไม่สามารถโหลดข้อมูล Analytics ได้ กรุณาลองอีกครั้ง
                </p>
              ) : siteViews === null && eventDetailViews === null ? (
                <p role="status">
                  API ยังไม่มีข้อมูลการเข้าชมเว็บไซต์และหน้าอีเวนต์
                </p>
              ) : (
                <>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span>การเข้าชมเว็บไซต์</span>
                      <strong>
                        {siteViews === null ? '—' : formatNumber(siteViews)}
                      </strong>
                    </div>
                    <div
                      style={{
                        height: 12,
                        background: '#E0F2FE',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width:
                            siteViews === null
                              ? '0%'
                              : `${(siteViews / maxViews) * 100}%`,
                          height: '100%',
                          background: '#38BDF8',
                          borderRadius: 999,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span>การเข้าชมหน้าอีเวนต์</span>
                      <strong>
                        {eventDetailViews === null
                          ? '—'
                          : formatNumber(eventDetailViews)}
                      </strong>
                    </div>
                    <div
                      style={{
                        height: 12,
                        background: '#FCE7F3',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width:
                            eventDetailViews === null
                              ? '0%'
                              : `${(eventDetailViews / maxViews) * 100}%`,
                          height: '100%',
                          background: '#F472B6',
                          borderRadius: 999,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                    ความยาวแถบแสดงสัดส่วนเมื่อเทียบกับค่าที่สูงที่สุดในสองรายการ
                  </p>
                </>
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-events" aria-busy={isLoading}>
          <div className="dashboard-chart-header">
            <div>
              <div className="dashboard-chart-label">รายละเอียดรายอีเวนต์</div>
              <h2>ผู้ลงทะเบียนของแต่ละอีเวนต์</h2>
            </div>
            <div className="dashboard-chart-tag">เลือกอีเวนต์เพื่อดูรายชื่อ</div>
          </div>

          {isLoading ? (
            <p role="status" className="dashboard-events-empty">
              กำลังโหลดข้อมูล…
            </p>
          ) : hasError ? (
            <p role="status" className="dashboard-events-empty">
              โหลดรายการอีเวนต์ไม่สำเร็จ
            </p>
          ) : events.length === 0 ? (
            <p role="status" className="dashboard-events-empty">
              ยังไม่มีอีเวนต์ในระบบ
            </p>
          ) : (
            <>
              <EventFilterBar
                filters={filters}
                setFilter={setFilter}
                clear={clear}
                activeCount={activeCount}
                counts={facetCounts}
                total={events.length}
                shown={filteredEvents.length}
                searchPlaceholder="ค้นหาอีเวนต์หรือชื่อผู้ลงทะเบียน"
              />

              {needsPersonIndex && (indexLoading || personMatches.length > 0) && (
                <div className="dashboard-people" aria-live="polite">
                  {indexLoading ? (
                    <p>กำลังค้นหาในรายชื่อผู้ลงทะเบียนทุกอีเวนต์…</p>
                  ) : personMatches.length > 0 ? (
                    <>
                      <div className="dashboard-people-title">
                        พบในรายชื่อผู้ลงทะเบียน {personMatches.length} รายการ
                      </div>
                      <ul>
                        {personMatches.slice(0, 6).map((person) => (
                          <li key={person.key}>
                            <button
                              type="button"
                              onClick={() =>
                                selectEvent(
                                  person.eventId,
                                  person.email || person.name,
                                )
                              }
                            >
                              <span className="dashboard-people-name">
                                <Highlight
                                  text={person.name}
                                  query={filters.q}
                                />
                              </span>
                              <span className="dashboard-people-meta">
                                {person.email && (
                                  <Highlight
                                    text={`${person.email} · `}
                                    query={filters.q}
                                  />
                                )}
                                {person.eventName}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {personMatches.length > 6 && (
                        <p className="dashboard-people-more">
                          และอีก {personMatches.length - 6} รายการ
                          ลองพิมพ์ให้เจาะจงขึ้น
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {!selectedEvent ? (
                <div className="ef-empty">
                  <strong>
                    {indexLoading
                      ? 'กำลังค้นหา…'
                      : 'ไม่พบอีเวนต์ที่ตรงกับเงื่อนไข'}
                  </strong>
                  ลองลดคำค้นหา หรือเอาตัวกรองบางอย่างออก
                  <div>
                    <button type="button" className="ef-clear" onClick={clear}>
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </div>
                </div>
              ) : (
            <>
              <div
                className="dashboard-event-picker"
                role="tablist"
                aria-label="เลือกอีเวนต์"
              >
                {filteredEvents.map((event) => {
                  const isSelected = event.id === selectedEventId;

                  return (
                    <button
                      key={event.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`dashboard-event-chip${
                        isSelected ? ' is-active' : ''
                      }`}
                      onClick={() => selectEvent(event.id)}
                    >
                      <span className="dashboard-event-chip-name">
                        <Highlight
                          text={event.title || event.name || 'ไม่มีชื่ออีเวนต์'}
                          query={filters.q}
                        />
                      </span>
                      <span className="dashboard-event-chip-count">
                        {formatNumber(toNumber(event.registeredCount) ?? 0)}
                        {toNumber(event.capacity) !== null
                          ? ` / ${formatNumber(toNumber(event.capacity))}`
                          : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="dashboard-event-info">
                <h3>{selectedEvent.title || selectedEvent.name}</h3>
                <p>
                  {formatEventDate(selectedEvent.startsAt)}
                  {selectedEvent.location
                    ? ` · ${selectedEvent.location}`
                    : ''}
                </p>
              </div>

              <EventAttendeesPanel
                key={`${selectedEventId}-${focusPerson}`}
                initialSearch={focusPerson}
                capacity={toNumber(selectedEvent.capacity)}
                registered={toNumber(selectedEvent.registeredCount)}
                attendees={attendees}
                loading={attendeesLoading}
                error={attendeesError}
              />
            </>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}