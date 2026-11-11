import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import Navbar from '../../components/Navbar';
import { guestService } from '../../api/guestService';
import { useAuth } from '../../context/AuthContext';
import { EVENT_TIME_ZONE, parseEventDateTime } from './eventDisplay';
import './MyRegistrationsPage.css';

const claimPage = { pathname: '/MyRegistrationsPage', search: '?from=guest' };
const bookingDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: EVENT_TIME_ZONE });

function GuestTicket({ ticket }) {
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    if (!ticket.ticketCode) return;
    let active = true;
    QRCode.toDataURL(ticket.ticketCode, { width: 216, margin: 2 })
      .then((image) => { if (active) setQr(image); })
      .catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [ticket.ticketCode]);

  const status = ticket.status === 'CANCELLED'
    ? ['cancelled', 'ยกเลิกแล้ว']
    : ticket.checkedInAt ? ['checked', 'เช็กอินแล้ว'] : ['success', 'พร้อมใช้'];
  const date = ticket.registeredAt ? parseEventDateTime(ticket.registeredAt) : null;

  return (
    <article className="registration-card guest-ticket">
      <div className="reg-details">
        <h2 className="reg-title">{ticket.eventTitle}</h2>
        <p className="reg-meta">
          <span>{ticket.displayName} · {ticket.quantity} ที่นั่ง</span>
          {date && !Number.isNaN(date.getTime()) && <span>จองเมื่อ {bookingDate.format(date)}</span>}
        </p>
        <span className={`status-pill ${status[0]}`}>{status[1]}</span>
        <Link className="empty-state-link" to={`/event-detail/${ticket.eventId}`}>ดูรายละเอียดอีเวนต์</Link>
      </div>
      {ticket.ticketCode && (
        <div className="guest-ticket-code">
          {qr && <img src={qr} width={216} height={216} alt="QR สำหรับเช็กอิน" />}
          {qrError && <p>แสดงรหัสบัตรให้เจ้าหน้าที่เช็กอินได้</p>}
          <span>รหัสบัตร</span>
          <strong>{ticket.ticketCode}</strong>
        </div>
      )}
    </article>
  );
}

export default function GuestTicketsPage() {
  const { isLoggedIn, openModal } = useAuth();
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    guestService.bookings()
      .then((tickets) => {
        if (!Array.isArray(tickets)) throw new Error('Invalid ticket list');
        if (active) setState({ tickets });
      })
      .catch(() => { if (active) setState({ error: true }); });
    return () => { active = false; };
  }, [retry]);

  return (
    <>
      <Navbar />
      <main className="registrations-container">
        <header className="page-header">
          <h1>บัตรที่จองไว้</h1>
          <p>บัตรที่จองโดยไม่เข้าสู่ระบบจากเบราว์เซอร์นี้ เปิด QR หรือแสดงรหัสบัตรให้เจ้าหน้าที่ตอนเข้างาน</p>
        </header>
        <div className="registrations-list">
          {state.loading && <p role="status">กำลังโหลดบัตร…</p>}
          {state.error && (
            <div className="empty-state" role="alert">
              <p>โหลดบัตรไม่สำเร็จ</p>
              <button className="btn-retry-registrations" type="button" onClick={() => {
                setState({ loading: true });
                setRetry((value) => value + 1);
              }}>ลองอีกครั้ง</button>
            </div>
          )}
          {state.tickets?.length === 0 && (
            <div className="empty-state">
              <p>ไม่พบบัตรในเบราว์เซอร์นี้</p>
              <Link className="empty-state-link" to="/UpcomingEventsPage">ค้นหาอีเวนต์</Link>
            </div>
          )}
          {state.tickets?.map((ticket) => <GuestTicket key={ticket.registrationId} ticket={ticket} />)}
          <section className="guest-claim" aria-label="เก็บบัตรในบัญชี">
            <h2>อยากเปิดบัตรจากเครื่องอื่น?</h2>
            <p>ใช้บัญชีที่สมัครด้วยอีเมลเดียวกับตอนจอง แล้วกรอกรหัสจากอีเมลเพื่อเพิ่มบัตรและประวัติในบัญชี</p>
            {isLoggedIn ? (
              <Link className="empty-state-link" to={claimPage}>ไปที่ประวัติการจอง</Link>
            ) : (
              <div className="guest-claim-actions">
                <button type="button" onClick={() => openModal('register', claimPage)}>สมัครด้วยอีเมลที่ใช้จอง</button>
                <button type="button" onClick={() => openModal('login', claimPage)}>เข้าสู่ระบบ</button>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
