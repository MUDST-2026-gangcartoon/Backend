
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar.jsx';
import BookingTools from '../components/BookingTools.jsx';
import DashboardOverview from '../components/DashboardOverview.jsx';
import ReportPanel from '../components/ReportPanel.jsx';
import FunnelReport from '../components/FunnelReport.jsx';
import { getAttendeeContact } from '../utils/bookingModel.js';
import { MOCK_BOOKINGS, MOCK_CAPACITY, isMockMode } from '../data/mockBookings.js';
import EventFilterBar, { Highlight } from '../components/EventFilterBar.jsx';
import { useEventFilters } from '../hooks/useEventFilters.js';
import {
  applyEventFilters,
  getFacetCounts,
  matchesTokens,
  sortEvents,
} from '../utils/eventFilters.js';
import {
  copyText,
  getUniqueEmails,
} from '../utils/attendeeExport.js';
import Icon from '../components/Icon.jsx';
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

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoadState, setAnalyticsLoadState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const mock = isMockMode();
  const requestedEventId = searchParams.get('event');
  const requestedView = searchParams.get('view');
  const view = ['overview', 'events', 'analytics'].includes(requestedView)
    ? requestedView : requestedEventId ? 'events' : 'overview';
  const showAnalytics = view === 'analytics';
  const showEvents = view === 'events';
  const reportView = searchParams.get('eventView');
  const eventView = !mock && ['summary', 'comparison'].includes(reportView) ? reportView : 'attendees';
  const showAttendees = showEvents && eventView === 'attendees';

  const selectView = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', value);
    setSearchParams(next);
  };

  const selectEventView = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set('eventView', value);
    setSearchParams(next, { replace: true });
  };
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
    if (!showAnalytics) return undefined;
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
  }, [retryCount, showAnalytics]);

  // ---- ค้นหา/กรอง ----
  const { filters, setFilter, clear, activeCount } = useEventFilters();
  const [attendeesReload, setAttendeesReload] = useState(0);
  const [toolbarNote, setToolbarNote] = useState('');
  const [allAttendees, setAllAttendees] = useState({});
  const [indexLoading, setIndexLoading] = useState(false);
  const [focusPerson, setFocusPerson] = useState('');
  const indexStarted = useRef(false);

  const needsPersonIndex = showEvents && filters.q.trim().length >= 2;

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
        .map((attendee) => {
          const { name, email } = getAttendeeContact(attendee);
          return [name, email, attendee.ticketCode].join(' ');
        })
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
        const { name, email } = getAttendeeContact(a);
        if (!matchesTokens([name, email, a.ticketCode].join(' '), filters.q)) {
          return;
        }

        found.push({
          key: `${event.id}-${a.registrationId ?? a.ticketCode ?? index}`,
          name: name || 'ไม่ระบุชื่อ',
          email,
          eventId: event.id,
          eventName: event.title || event.name || '',
        });
      });
    });

    return found;
  }, [allAttendees, events, filters.q, needsPersonIndex]);

  // อีเวนต์ที่เลือกดูรายละเอียด (อ่านจาก ?event= ได้ เพื่อให้ลิงก์จากหน้าจัดการอีเวนต์เปิดตรงอีเวนต์นั้น)
  const selectedEvent =
    filteredEvents.find((event) => String(event.id) === requestedEventId) ??
    filteredEvents[0] ??
    null;
  const selectedEventId = selectedEvent?.id ?? null;

  useEffect(() => {
    if (!showAttendees || mock || selectedEventId === null) {
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
  }, [showAttendees, mock, selectedEventId, attendeesReload]);

  const selectEvent = (id, person = '') => {
    const next = new URLSearchParams(searchParams);
    next.set('event', String(id));
    if (person) next.set('eventView', 'attendees');
    setSearchParams(next, { replace: true });
    setFocusPerson(person);
  };

  // ---- เครื่องมือของอีเวนต์ที่เลือก ----
  const attendeeEmails = useMemo(
    () => getUniqueEmails(attendees.map(getAttendeeContact)),
    [attendees],
  );
  const hasAttendees = attendees.length > 0 && !attendeesLoading;

  const showNote = (text) => {
    setToolbarNote(text);
    window.setTimeout(() => setToolbarNote(''), 3500);
  };

  const handleCopyEmails = async () => {
    try {
      await copyText(attendeeEmails.join(', '));
      showNote(`คัดลอก ${attendeeEmails.length} อีเมลแล้ว`);
    } catch {
      showNote('คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  };

  const handleRefresh = () => {
    setAttendeesReload((count) => count + 1);
    showNote('กำลังโหลดรายชื่อล่าสุด…');
  };

  const isLoading = loadState === 'loading';
  const hasError = loadState === 'error';

  const isAnalyticsLoading = analyticsLoadState === 'loading';
  const hasAnalyticsError = analyticsLoadState === 'error';

  const uniqueVisitors = toNumber(analytics?.uniqueVisitors);
  const siteViews = toNumber(analytics?.siteViews);
  const eventDetailViews = toNumber(analytics?.eventDetailViews);
  const maxViews = Math.max(siteViews ?? 0, eventDetailViews ?? 0, 1);

  return (
    <>
      <AdminNavbar />

      <main className="dashboard-page">
        <section className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>แดชบอร์ดอีเวนต์</h1>
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

        <nav className="dashboard-view-switch" aria-label="มุมมองแดชบอร์ด">
          <button type="button" aria-pressed={view === 'overview'} onClick={() => selectView('overview')}>ภาพรวม</button>
          <button type="button" aria-pressed={showEvents} onClick={() => selectView('events')}>รายอีเวนต์</button>
          <button type="button" aria-pressed={showAnalytics} onClick={() => selectView('analytics')}>สถิติเชิงลึก</button>
        </nav>

        {view === 'overview' && (
          <DashboardOverview events={events} loading={isLoading} error={hasError} onRefresh={() => setRetryCount((count) => count + 1)} />
        )}

        {showAnalytics && (
          <div className="dashboard-overview">
            <section className="dashboard-charts">
              <article className="dashboard-chart-card dashboard-bar-card">
                <h2>การเข้าชมเว็บ</h2>
                {uniqueVisitors !== null && <p className="dashboard-visitor-count"><strong>{formatNumber(uniqueVisitors)}</strong> ผู้เข้าชมไม่ซ้ำ</p>}
                {isAnalyticsLoading ? (
                  <p className="bt-report-note" role="status">กำลังโหลดสถิติการเข้าชม…</p>
                ) : hasAnalyticsError ? (
                  <p className="bt-report-note" role="alert">
                    โหลดสถิติการเข้าชมไม่สำเร็จ{' '}
                    <button type="button" className="bt-btn" onClick={() => setRetryCount((count) => count + 1)}>ลองอีกครั้ง</button>
                  </p>
                ) : siteViews === null && eventDetailViews === null ? (
                  <p className="bt-report-note">ยังไม่มีข้อมูลการเข้าชม</p>
                ) : (
                  <ul className="funnel-bars" aria-label="กราฟจำนวนครั้งที่เข้าชม">
                    {[
                      ['หน้าเว็บทั้งหมด', siteViews],
                      ['หน้ารายละเอียดอีเวนต์', eventDetailViews],
                    ].map(([label, views]) => (
                      <li key={label}>
                        <div><span>{label}</span><strong>{views == null ? '—' : `${formatNumber(views)} ครั้ง`}</strong></div>
                        <div className="funnel-track" aria-hidden="true">
                          <span style={{ width: `${(views ?? 0) / maxViews * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              {!isMockMode() && (
                <article className="dashboard-chart-card">
                  <FunnelReport />
                </article>
              )}
            </section>
          </div>
        )}

        {showEvents && (
          <section className="dashboard-events" aria-busy={isLoading}>
            <div className="dashboard-chart-header">
              <div>
                <h2>เลือกอีเวนต์</h2>
              </div>
            </div>

            {isLoading ? (
              <p role="status" className="dashboard-events-empty">
                กำลังโหลดข้อมูล…
              </p>
            ) : hasError ? (
              <p role="status" className="dashboard-events-empty">
                โหลดรายการอีเวนต์ไม่สำเร็จ{' '}
                <button type="button" className="bt-btn" onClick={() => setRetryCount((count) => count + 1)}>ลองอีกครั้ง</button>
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

                    {!mock && (
                      <nav className="dashboard-view-switch dashboard-event-views" aria-label="ข้อมูลอีเวนต์">
                        <button type="button" aria-pressed={eventView === 'attendees'} onClick={() => selectEventView('attendees')}>รายชื่อผู้จอง</button>
                        <button type="button" aria-pressed={eventView === 'summary'} onClick={() => selectEventView('summary')}>สรุปอีเวนต์</button>
                        <button type="button" aria-pressed={eventView === 'comparison'} onClick={() => selectEventView('comparison')}>เปรียบเทียบการจอง</button>
                      </nav>
                    )}

                    {eventView === 'summary' && (
                      <ReportPanel key={selectedEventId} eventId={selectedEventId} eventEnded={selectedEvent.status === 'ENDED'} />
                    )}
                    {eventView === 'comparison' && (
                      <FunnelReport key={selectedEventId} eventId={selectedEventId} />
                    )}
                    {showAttendees && (
                      <>
                        {mock && <p className="bt-mock-note">กำลังแสดงข้อมูลตัวอย่าง</p>}
                        {!mock && (
                          <div className="dashboard-attendee-tools">
                            <div className="dashboard-toolbar-actions" role="group" aria-label="เครื่องมือรายชื่อผู้จอง">
                              <button type="button" onClick={handleCopyEmails} disabled={!hasAttendees || attendeeEmails.length === 0}>
                                <Icon name="copy" /> คัดลอกอีเมล
                              </button>
                              <button type="button" onClick={() => window.print()} disabled={!hasAttendees}>
                                <Icon name="print" /> พิมพ์รายชื่อ
                              </button>
                              <button type="button" onClick={handleRefresh} disabled={attendeesLoading}>
                                <Icon name="refresh" /> รีเฟรช
                              </button>
                            </div>
                            <span className="dashboard-toolbar-note" role="status">{toolbarNote}</span>
                          </div>
                        )}
                        <BookingTools
                          key={`${selectedEventId}-${focusPerson}`}
                          initialSearch={focusPerson}
                          eventName={selectedEvent.title || selectedEvent.name || 'event'}
                          capacity={mock ? MOCK_CAPACITY : toNumber(selectedEvent.capacity)}
                          showSummary={mock}
                          bookings={mock ? MOCK_BOOKINGS : attendees}
                          loading={!mock && attendeesLoading}
                          error={mock ? '' : attendeesError}
                          onRetry={() => setAttendeesReload((count) => count + 1)}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
