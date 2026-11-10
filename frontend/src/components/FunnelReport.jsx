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
const fields = [
  ['startedAttempts', 'เริ่มลงทะเบียน'], ['completedAttempts', 'ลงทะเบียนสำเร็จ'],
  ['maturedAttempts', 'ครบกำหนดประเมิน'], ['pendingAttempts', 'รอครบกำหนด'],
  ['droppedOffAttempts', 'ไม่สำเร็จภายในกำหนด'], ['dropOffRate', 'Drop-off rate'],
  ['confirmedOrders', 'รายการจอง'], ['confirmedSeats', 'ที่นั่งที่จอง'],
  ['activeSeats', 'ที่นั่งถือสิทธิ์'], ['checkedInSeats', 'ที่นั่งเช็กอิน'],
  ['showRate', 'Show rate'], ['cancelledOrders', 'รายการยกเลิก'], ['cancelledSeats', 'ที่นั่งยกเลิก'],
];

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
    const params = new URLSearchParams({ ...range, eventId: String(eventId) });
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

  return (
    <section className="bt-summary-wrap" aria-label="รายงานขั้นตอนการลงทะเบียน">
      <h3>รายงานขั้นตอนการลงทะเบียน</h3>
      <form onSubmit={submit} className="funnel-filters">
        <label>
          ตั้งแต่วันที่
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          ถึงวันที่ (รวมวันสิ้นสุด)
          <input type="date" value={through} onChange={(e) => setThrough(e.target.value)} required />
        </label>
        <button type="submit">แสดงรายงาน</button>
      </form>
      {validation && <p role="alert">{validation}</p>}
      <p className="bt-mock-note">
        ช่วงวันที่รวมทั้งวันเริ่มต้นและวันสิ้นสุด ตามเวลาไทย · ความพยายามนับตามเวลาเริ่ม
        ส่วนรายการจองนับตามเวลาจอง จึงอาจมีฐานต่างกัน
      </p>
      {state.loading ? (
        <p role="status">กำลังโหลดรายงาน…</p>
      ) : state.error ? (
        <p role="alert">
          โหลดรายงานไม่สำเร็จ{' '}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>ลองอีกครั้ง</button>
        </p>
      ) : (
        <>
          <p className="bt-mock-note">
            ข้อมูล {range.from} ถึง {shiftDate(range.to, -1)} · ประเมิน drop-off หลัง {state.data.maturityMinutes} นาที;
            รายการที่ยังไม่ครบกำหนดไม่นับในฐาน · Show rate = ที่นั่งเช็กอิน ÷ ที่นั่งถือสิทธิ์
          </p>
          {state.data.total.startedAttempts === 0 && state.data.total.confirmedOrders === 0 && (
            <p role="status">ไม่มีข้อมูลในช่วงวันที่เลือก</p>
          )}
          <div className="funnel-table-wrap">
            <table className="funnel-table">
              <thead>
                <tr><th>ตัวชี้วัด</th><th>ทั้งหมด</th><th>Guest</th><th>สมาชิก</th></tr>
              </thead>
              <tbody>
                {fields.map(([key, label]) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    {['total', 'guest', 'user'].map((group) => {
                      const value = state.data[group][key];
                      return <td key={group}>{value == null ? '—' : `${formatter.format(value)}${key.endsWith('Rate') ? '%' : ''}`}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
