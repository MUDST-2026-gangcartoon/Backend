import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../api/eventService.js';
import { useNow } from '../hooks/useLiveRefresh.js';
import { getAttendanceMetrics, reportCount } from '../utils/attendanceMetrics.js';
import { EVENT_TIME_ZONE, parseEventDateTime } from '../pages/user/eventDisplay.js';

const DAY = 24 * 60 * 60 * 1000;
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, dateStyle: 'short' });
const eventDate = new Intl.DateTimeFormat('th-TH', { timeZone: EVENT_TIME_ZONE, day: 'numeric', month: 'short' });
const eventTime = new Intl.DateTimeFormat('th-TH', { timeZone: EVENT_TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const number = new Intl.NumberFormat('th-TH');

function AttendanceStatus({ eventId, ended }) {
  const [result, setResult] = useState({ loading: true });

  useEffect(() => {
    let active = true;
    eventService.getEventReport(eventId).then((response) => {
      if (active) setResult({ report: response?.data ?? response });
    }).catch(() => {
      if (active) setResult({ error: true });
    });
    return () => { active = false; };
  }, [eventId]);

  if (result.loading) return <span>กำลังโหลดยอดเช็กอิน…</span>;
  const { activeSeats, checkedInSeats, showRate } = getAttendanceMetrics(result.report ?? {});
  if (result.error || activeSeats === null || checkedInSeats === null) return <span>ยังดูยอดเช็กอินไม่ได้</span>;
  if (activeSeats === 0) return <span>ไม่มีที่นั่งที่จองไว้</span>;

  return (
    <span>
      {ended ? 'มาเช็กอิน ' : 'เช็กอินแล้ว '}<strong>{number.format(checkedInSeats)} จาก {number.format(activeSeats)} ที่นั่ง</strong>
      {ended && showRate && ` (${showRate})`}
    </span>
  );
}

function hasLowAvailability({ capacity, spots, event }) {
  return capacity > 0 && spots !== null && spots <= capacity * 0.2 && ['OPEN', 'FULL'].includes(event.status);
}

function OverviewEvent({ item, kind, now }) {
  const { event, start, end, capacity, spots, ongoing } = item;
  const summary = kind === 'recent';
  const isToday = kind === 'today';
  const date = summary ? end : start;
  const checkinOpens = parseEventDateTime(event.checkinOpensAt).getTime();
  const checkinCloses = parseEventDateTime(event.checkinClosesAt).getTime();
  const checkinNotOpen = isToday && checkinOpens > now;
  const checkinClosed = isToday && checkinCloses <= now;
  const showSummary = !isToday;
  const label = showSummary ? 'เปิดสรุปอีเวนต์' : 'ดูรายชื่อผู้จอง';
  const target = `/admin/dashboard?view=events&event=${encodeURIComponent(event.id)}&eventView=${showSummary ? 'summary' : 'attendees'}`;

  return (
    <li className="dashboard-work-row">
      <div className="dashboard-work-event">
        <h3>{event.title || event.name || 'อีเวนต์ไม่มีชื่อ'}</h3>
        <p>{eventDate.format(date)} · {isToday ? (ongoing ? 'กำลังจัด' : `เริ่ม ${eventTime.format(start)} น.`) : `${eventTime.format(date)} น.`}</p>
      </div>
      <div className="dashboard-work-signal">
        {checkinNotOpen && <span>เปิดเช็กอิน {eventTime.format(checkinOpens)} น.</span>}
        {(isToday || summary) && !checkinNotOpen && (
          <>
            {checkinClosed && <span className="dashboard-work-checkin-label">ปิดเช็กอินแล้ว</span>}
            <AttendanceStatus eventId={event.id} ended={summary} />
          </>
        )}
        {kind === 'next' && (
          event.status === 'CLOSED' ? <span>ปิดรับจองแล้ว</span> : capacity > 0 && spots !== null && (
            spots === 0 ? <strong>เต็มแล้ว</strong> : (
              <span>
                {hasLowAvailability(item) ? 'ใกล้เต็ม · ' : ''}เหลือ <strong>{number.format(spots)} จาก {number.format(capacity)} ที่นั่ง</strong>
              </span>
            )
          )
        )}
      </div>
      <Link to={target} className="dashboard-work-link">{label}</Link>
    </li>
  );
}

export default function DashboardOverview({ events, loading, error, onRefresh }) {
  const now = useNow(60_000);
  const day = dayKey.format(now);
  const scheduled = events.map((event) => {
    const start = parseEventDateTime(event.startsAt).getTime();
    const end = parseEventDateTime(event.endsAt).getTime();
    const ended = Number.isFinite(end) ? end <= now : event.status === 'ENDED';
    return {
      event, start, end, ended,
      ongoing: start <= now && !ended,
      capacity: reportCount(event.capacity),
      spots: reportCount(event.spotsLeft),
    };
  }).filter(({ start }) => Number.isFinite(start)).sort((a, b) => a.start - b.start);

  const today = scheduled.filter((item) => !item.ended && (item.ongoing || dayKey.format(item.start) === day));
  const upcoming = scheduled
    .filter((item) => !item.ended && item.start > now && dayKey.format(item.start) !== day)
    .sort((a, b) => Number(hasLowAvailability(b)) - Number(hasLowAvailability(a)) || a.start - b.start);
  const recent = scheduled.filter(({ ended, end }) => ended && end >= now - 7 * DAY)
    .sort((a, b) => b.end - a.end);

  return (
    <section className="dashboard-work" aria-label="อีเวนต์ที่ต้องดูแล" aria-busy={loading}>
      <div className="dashboard-work-header">
        <h2>อีเวนต์ที่ต้องดูแล</h2>
        <button type="button" className="bt-btn" onClick={onRefresh} disabled={loading}>อัปเดตข้อมูล</button>
      </div>
      {loading ? <p className="bt-report-note" role="status">กำลังโหลดอีเวนต์…</p> : error ? (
        <p className="bt-report-note" role="alert">โหลดอีเวนต์ไม่สำเร็จ กดอัปเดตข้อมูลเพื่อลองอีกครั้ง</p>
      ) : (
        <>
          <section className="dashboard-work-section dashboard-work-section-today">
            <h3>วันนี้และงานที่กำลังจัด</h3>
            {today.length ? (
              <ul>{today.slice(0, 3).map((item) => <OverviewEvent key={item.event.id} item={item} kind="today" now={now} />)}</ul>
            ) : <p className="bt-report-note">วันนี้ไม่มีอีเวนต์ที่กำลังจัดหรือรอเริ่ม</p>}
            {today.length > 3 && <Link to="/admin/dashboard?view=events" className="dashboard-work-link">ดูอีเวนต์ทั้งหมด</Link>}
          </section>
          <div className="dashboard-work-secondary">
            <section className="dashboard-work-section">
              <h3>งานที่กำลังจะมาถึง</h3>
              {upcoming.length ? (
                <ul>{upcoming.slice(0, 3).map((item) => <OverviewEvent key={item.event.id} item={item} kind="next" />)}</ul>
              ) : <p className="bt-report-note">ยังไม่มีอีเวนต์ถัดไป</p>}
            </section>
            <section className="dashboard-work-section">
              <h3>อีเวนต์ที่จบใน 7 วันที่ผ่านมา</h3>
              {recent.length ? (
                <ul>{recent.slice(0, 3).map((item) => <OverviewEvent key={item.event.id} item={item} kind="recent" />)}</ul>
              ) : <p className="bt-report-note">ยังไม่มีอีเวนต์ที่จบในช่วงนี้</p>}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
