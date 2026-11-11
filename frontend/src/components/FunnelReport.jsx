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
    ['pendingAttempts', 'กำลังจอง (ยังไม่ครบเวลา)'],
    ['maturedAttempts', 'เริ่มจองมาครบเวลาแล้ว'],
    ['droppedOffAttempts', 'จองไม่ทันเวลา'],
    ['dropOffRate', 'เปอร์เซ็นต์ที่จองไม่ทัน'],
  ]],
  ['รายการจองและเช็กอิน', [
    ['confirmedOrders', 'รายการจองทั้งหมด'],
    ['confirmedSeats', 'ที่นั่งที่เคยจอง'],
    ['cancelledOrders', 'รายการที่ยกเลิก'],
    ['cancelledSeats', 'ที่นั่งที่ยกเลิก'],
    ['activeSeats', 'ที่นั่งที่จองไว้ (ไม่รวมที่ยกเลิก)'],
    ['checkedInSeats', 'ที่นั่งที่เช็กอินแล้ว'],
    ['showRate', 'เปอร์เซ็นต์เช็กอิน'],
  ]],
];
const reportDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'UTC' });
const formatDate = (value) => reportDate.format(new Date(`${value}T00:00:00Z`));
const formatValue = (key, value) => value == null ? '—' : `${formatter.format(value)}${key.endsWith('Rate') ? '%' : ''}`;

function FunnelOverview({ counts, minutes }) {
  const steps = [
    { label: 'เริ่มจอง', value: counts.startedAttempts },
    { label: 'จองสำเร็จ', value: counts.completedAttempts },
    { label: 'จองไม่ทันเวลา', value: counts.droppedOffAttempts },
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
      <dl className="funnel-highlights">
        <div>
          <dt>จองไม่ทันเวลา</dt>
          <dd>{formatValue('dropOffRate', counts.dropOffRate)}</dd>
          <small>จองไม่เสร็จใน {minutes} นาที {formatter.format(counts.droppedOffAttempts)} จาก {formatter.format(counts.maturedAttempts)} ครั้งที่เริ่มจองมาครบเวลา</small>
        </div>
        <div>
          <dt>เปอร์เซ็นต์เช็กอิน</dt>
          <dd>{formatValue('showRate', counts.showRate)}</dd>
          <small>เช็กอิน {formatter.format(counts.checkedInSeats)} จาก {formatter.format(counts.activeSeats)} ที่นั่ง</small>
        </div>
      </dl>
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
    if (!from || !through || from > through) { setValidation('เลือกวันเริ่มต้นและวันสิ้นสุดให้ถูกต้อง'); return; }
    const to = shiftDate(through, 1);
    const [year, month, day] = from.split('-').map(Number);
    const max = new Date(Date.UTC(year + 1, month - 1, day));
    // LocalDate.plusYears clamps leap day to February 28.
    if (month === 2 && day === 29 && max.getUTCMonth() !== 1) max.setUTCDate(0);
    if (to > dateText(max)) { setValidation('ช่วงรายงานต้องไม่เกินหนึ่งปี'); return; }
    setValidation('');
    setRange({ from, to });
  }

  const title = eventId == null ? 'เส้นทางการจองทุกอีเวนต์' : 'รายงานขั้นตอนการลงทะเบียน';

  return (
    <section className="funnel-report" aria-label={title}>
      <h3>{title}</h3>
      <form onSubmit={submit} className="funnel-filters">
        <label>
          ตั้งแต่วันที่
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          ถึงวันที่
          <input type="date" value={through} onChange={(e) => setThrough(e.target.value)} required />
        </label>
        <button className="bt-btn" type="submit">แสดงรายงาน</button>
      </form>
      {validation && <p className="bt-report-note" role="alert">{validation}</p>}
      {state.loading ? (
        <p className="bt-report-note" role="status">กำลังโหลดรายงาน…</p>
      ) : state.error ? (
        <p className="bt-report-note" role="alert">
          โหลดรายงานไม่สำเร็จ{' '}
          <button className="bt-btn" type="button" onClick={() => setRetry((n) => n + 1)}>ลองอีกครั้ง</button>
        </p>
      ) : (
        <>
          <p className="bt-report-note">
            {formatDate(range.from)} ถึง {formatDate(shiftDate(range.to, -1))} (รวมวันสุดท้าย · เวลาไทย)
          </p>
          {state.data.total.startedAttempts === 0 && state.data.total.confirmedOrders === 0 && (
            <p className="bt-report-note" role="status">ไม่มีข้อมูลในช่วงวันที่เลือก</p>
          )}
          <FunnelOverview counts={state.data.total} minutes={state.data.maturityMinutes} />
          {eventId != null && (
            <div className="funnel-table-wrap">
              <table className="funnel-table">
                <caption>เปรียบเทียบการจองของสมาชิกและผู้ที่จองโดยไม่เข้าสู่ระบบ</caption>
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
