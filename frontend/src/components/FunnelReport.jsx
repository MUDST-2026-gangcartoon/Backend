import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient.js';
import './booking-tools.css';

const formatter = new Intl.NumberFormat('th-TH');
const dateText = (date) => date.toISOString().slice(0, 10);
const shiftDate = (value, days) => {
  const [year, month, day] = value.split('-').map(Number);
  return dateText(new Date(Date.UTC(year, month - 1, day + days)));
};
const bangkokToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const groups = [
  ['total', 'รวม'], ['guest', 'ไม่เข้าสู่ระบบ'], ['user', 'สมาชิก'],
];
const sections = [
  ['ขั้นตอนการจอง', [
    ['startedAttempts', 'เริ่มจอง'],
    ['completedAttempts', 'จองสำเร็จ'],
    ['droppedOffAttempts', 'จองไม่ทันเวลา'],
    ['dropOffRate', 'เปอร์เซ็นต์ที่จองไม่ทัน'],
  ]],
  ['รายการจองและเช็กอิน', [
    ['confirmedOrders', 'รายการจองทั้งหมด (รวมที่ยกเลิก)'],
    ['cancelledOrders', 'รายการที่ยกเลิก'],
    ['cancelledSeats', 'ที่นั่งที่ยกเลิก'],
    ['activeSeats', 'ที่นั่งที่จองแล้ว'],
    ['checkedInSeats', 'ที่นั่งที่เช็กอินแล้ว'],
    ['showRate', 'เปอร์เซ็นต์เช็กอิน'],
  ]],
];
const reportDate = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDate = (value) => reportDate.format(new Date(`${value}T00:00:00Z`));
const formatValue = (key, value) => value == null ? '—' : `${formatter.format(value)}${key.endsWith('Rate') ? '%' : ''}`;

function FunnelOverview({ counts, minutes }) {
  const steps = [
    { label: 'เริ่มจอง', value: counts.startedAttempts },
    { label: 'จองสำเร็จ', value: counts.completedAttempts },
  ];
  const max = Math.max(...steps.map(({ value }) => value), 1);

  return (
    <div className="funnel-overview">
      <ul className="funnel-bars" aria-label="กราฟขั้นตอนการจอง">
        {steps.map(({ label, value }) => (
          <li key={label}>
            <div><span>{label}</span><strong>{formatter.format(value)} ครั้ง</strong></div>
            <div className="funnel-track" aria-hidden="true">
              <span style={{ width: `${value / max * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {counts.dropOffRate != null && (
        <p className="dashboard-funnel-rate">
          <strong>{formatValue('dropOffRate', counts.dropOffRate)}</strong> จองไม่เสร็จใน {minutes} นาที
          <small>{formatter.format(counts.droppedOffAttempts)} จาก {formatter.format(counts.maturedAttempts)} ครั้งที่เริ่มจองมาครบเวลา</small>
        </p>
      )}
    </div>
  );
}

export default function FunnelReport({ eventId }) {
  const [initial] = useState(() => {
    const today = bangkokToday();
    return { from: shiftDate(today, -29), through: today, to: shiftDate(today, 1) };
  });
  const [from, setFrom] = useState(initial.from);
  const [through, setThrough] = useState(initial.through);
  const [range, setRange] = useState(() => ({ from: initial.from, to: initial.to }));
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const [validation, setValidation] = useState('');
  const appliedThrough = shiftDate(range.to, -1);
  const hasDateChange = from !== range.from || through !== appliedThrough;
  const displayedDates = range.from === appliedThrough
    ? `วันที่ ${formatDate(range.from)}`
    : `${formatDate(range.from)} ถึง ${formatDate(appliedThrough)}`;

  useEffect(() => {
    let current = true;
    setState({ loading: true });
    const params = new URLSearchParams(range);
    if (eventId != null) params.set('eventId', String(eventId));
    apiClient.get(`/admin/analytics/funnel?${params}`).then((data) => {
      if (!data?.total || !data?.guest || !data?.user) throw new Error('รูปแบบรายงานไม่ถูกต้อง');
      if (current) setState({ data });
    }).catch(() => { if (current) setState({ error: true }); });
    return () => { current = false; };
  }, [eventId, range, retry]);

  function submit(e) {
    e.preventDefault();
    if (!hasDateChange || state.loading) return;
    if (!from || !through || from > through) { setValidation('เลือกวันเริ่มต้นและวันสิ้นสุดให้ถูกต้อง'); return; }
    const to = shiftDate(through, 1);
    const [year, month, day] = from.split('-').map(Number);
    const max = new Date(Date.UTC(year + 1, month - 1, day));
    // LocalDate.plusYears clamps leap day to February 28.
    if (month === 2 && day === 29 && max.getUTCMonth() !== 1) max.setUTCDate(0);
    if (to > dateText(max)) { setValidation('ช่วงรายงานต้องไม่เกินหนึ่งปี'); return; }
    setValidation('');
    setState({ loading: true });
    setRange({ from, to });
  }

  const allEvents = eventId == null;
  const title = allEvents ? 'เส้นทางการจองทุกอีเวนต์' : 'รายงานขั้นตอนการลงทะเบียน';

  return (
    <section className="funnel-report" aria-label={title}>
      {allEvents && <h2>ขั้นตอนการจองผ่านเว็บ</h2>}
      <form onSubmit={submit} className="funnel-filters">
        <label>
          ตั้งแต่วันที่
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setValidation(''); }} required />
        </label>
        <label>
          ถึงวันที่
          <input type="date" value={through} onChange={(e) => { setThrough(e.target.value); setValidation(''); }} required />
        </label>
        <button className="bt-btn" type="submit" disabled={!hasDateChange || state.loading}>
          {state.loading ? 'กำลังโหลด…' : 'ใช้ช่วงวันที่'}
        </button>
      </form>
      {validation && <p className="bt-report-note" role="alert">{validation}</p>}
      {state.loading ? (
        <p className="bt-report-note" role="status">กำลังโหลดข้อมูล {displayedDates}</p>
      ) : state.error ? (
        <p className="bt-report-note" role="alert">
          โหลดข้อมูล {displayedDates} ไม่สำเร็จ{' '}
          <button className="bt-btn" type="button" onClick={() => {
            setState({ loading: true });
            setRetry((n) => n + 1);
          }}>ลองอีกครั้ง</button>
        </p>
      ) : (
        <>
          <p className="bt-report-note funnel-applied-range" role="status">กำลังแสดงข้อมูล {displayedDates}</p>
          {allEvents && state.data.total.startedAttempts === 0 && (
            <div className="funnel-empty">
              <strong>ไม่พบการเริ่มจองผ่านเว็บในช่วงนี้</strong>
              <p>
                {state.data.total.confirmedOrders > 0
                  ? `มีรายการจอง ${formatter.format(state.data.total.confirmedOrders)} รายการในช่วงนี้ กราฟนี้ใช้ข้อมูลจากการกดเริ่มจองบนเว็บ`
                  : 'ลองเลือกช่วงวันที่อื่นเพื่อดูข้อมูลการจอง'}
              </p>
            </div>
          )}
          {allEvents && state.data.total.startedAttempts > 0 && (
            <FunnelOverview counts={state.data.total} minutes={state.data.maturityMinutes} />
          )}
          {!allEvents && (
            <div className="funnel-table-wrap">
              {state.data.total.startedAttempts === 0 && state.data.total.confirmedOrders === 0 && (
                <p className="bt-report-note" role="status">ไม่มีข้อมูลในช่วงวันที่เลือก</p>
              )}
              <p className="bt-report-note">หนึ่งรายการจองอาจมีหลายที่นั่ง ยอดที่นั่งและอัตราเช็กอินไม่นับรายการที่ยกเลิก</p>
              <table className="funnel-table">
                <caption>สมาชิกและผู้ที่จองโดยไม่เข้าสู่ระบบ</caption>
                <thead>
                  <tr>
                    <th scope="col">รายการ</th>
                    {groups.map(([key, label]) => <th key={key} scope="col">{label}</th>)}
                  </tr>
                </thead>
                {sections.map(([heading, fields]) => (
                  <tbody key={heading}>
                    <tr className="funnel-table-heading"><th scope="rowgroup" colSpan={4}>{heading}</th></tr>
                    {fields.map(([key, label]) => (
                      <tr key={key}>
                        <th scope="row">{label}</th>
                        {groups.map(([group]) => (
                          <td key={group}>{formatValue(key, state.data[group][key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
