
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import Navbar from '../../components/Navbar';
import { registrationService } from '../../api/registrationService';
import './MyTicketsPage.css';
import { EVENT_CATEGORY_LABELS, EVENT_TIME_ZONE, parseEventDateTime } from './eventDisplay';
import { getRegistrationItems, isCancelledRegistration } from './registrationDisplay';

const formatDateTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุวันเวลา';

  const date = parseEventDateTime(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'ไม่ระบุวันเวลา';
  }

  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatDate = (dateString) => {
  if (!dateString) return 'ไม่ระบุวันที่';

  const date = parseEventDateTime(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'ไม่ระบุวันที่';
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
};

const getErrorMessage = (error) => {
  const status = error?.status ?? error?.response?.status;

  if (status === 401 || status === 403) {
    return 'กรุณาเข้าสู่ระบบเพื่อดูตั๋วของคุณ';
  }

  return 'ไม่สามารถโหลดตั๋วได้ กรุณาลองใหม่อีกครั้ง';
};

const normalizeRegistration = (registration) => {
  const event = registration.event ?? {};
  const ticketCode = registration.ticketCode
    ? String(registration.ticketCode)
    : '';

  const checkedInAt = registration.checkedInAt ?? null;
  const cancelled = isCancelledRegistration(registration);

  return {
    registrationId: registration.id ?? registration.registrationId,
    ticketId: ticketCode || String(registration.id ?? ''),
    ticketCode,
    ticketIdLabel: ticketCode ? 'รหัสบัตร' : 'รหัสลงทะเบียน',
    eventName: event.title || 'ไม่พบชื่ออีเวนต์',
    category:
      EVENT_CATEGORY_LABELS[event.category] || event.category || 'อีเวนต์',
    startsAt: event.startsAt,
    location: event.location || 'ไม่ระบุสถานที่',
    ticketType: registration.ticketTypeName || 'ไม่ระบุประเภทบัตร',
    registeredAt: registration.registeredAt,
    quantity: registration.quantity ?? 1,
    checkedInAt,
    isCheckedIn: !cancelled && Boolean(checkedInAt),
    cancelled,
    cancelReason: registration.cancelReason,
  };
};

export default function MyTicketsPage() {
  const [searchParams] = useSearchParams();
  const requestedTicketId = searchParams.get('ticketId');
  const requestedRegistrationId = searchParams.get('registrationId');

  const [tickets, setTickets] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await registrationService.getMyRegistrations();
        const normalizedTickets = getRegistrationItems(response)
          .map(normalizeRegistration)
          .filter((ticket) => ticket.ticketId);

        // สร้าง QR จาก ticketCode ที่ Backend ส่งกลับมา
        // รายการที่เช็กอินแล้วจะไม่สร้าง QR สำหรับใช้งานซ้ำ
        const qrEntries = await Promise.all(
          normalizedTickets
            .filter(
              (ticket) => ticket.ticketCode && !ticket.cancelled && !ticket.isCheckedIn
            )
            .map(async (ticket) => {
              try {
                const qrDataUrl = await QRCode.toDataURL(
                  ticket.ticketCode,
                  {
                    width: 250,
                    margin: 2,
                    errorCorrectionLevel: 'M',
                  }
                );

                return [ticket.ticketId, qrDataUrl];
              } catch {
                return [ticket.ticketId, ''];
              }
            })
        );

        if (isMounted) {
          setTickets(normalizedTickets);
          setQrCodes(Object.fromEntries(qrEntries));
          setSelectedTicket(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setTickets([]);
          setQrCodes({});
          setSelectedTicket(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTickets();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  // ผูก QR เข้ากับตั๋วแต่ละใบ
  const ticketsWithQr = tickets.map((ticket) => ({
    ...ticket,
    qrCode: ticket.cancelled || ticket.isCheckedIn
      ? ''
      : qrCodes[ticket.ticketId] || '',
  }));

  // รองรับการเปิดหน้าด้วย ?ticketId=...
  const visibleTickets = requestedRegistrationId
    ? ticketsWithQr.filter((ticket) => String(ticket.registrationId) === requestedRegistrationId)
    : requestedTicketId
    ? ticketsWithQr.filter(
        (ticket) => ticket.ticketId === requestedTicketId
      )
    : ticketsWithQr;

  const openTicketQr = (ticket) => {
    if (!ticket.cancelled && !ticket.isCheckedIn && ticket.qrCode) {
      setSelectedTicket(ticket);
    }
  };

  // ปิดหน้าต่าง QR ด้วยปุ่ม Escape
  useEffect(() => {
    if (!selectedTicket) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket]);

  return (
    <>
      <Navbar />

      <main className="tickets-container">
        <div className="tickets-header">
          <div className="text-blue-tag">บัตรของฉัน</div>
          <h1>ตั๋วของฉัน</h1>
          <p>
            ดูข้อมูลการลงทะเบียนและแสดง QR Code
            ให้เจ้าหน้าที่ตรวจสอบเมื่อเข้าร่วมอีเวนต์
          </p>
        </div>

        <div className="tickets-list">
          {loading ? (
            <div className="empty-state" role="status">
              กำลังโหลดตั๋วของคุณ...
            </div>
          ) : errorMessage ? (
            <div className="empty-state" role="alert">
              <p>{errorMessage}</p>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)}>ลองโหลดอีกครั้ง</button>
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="empty-state">
              {requestedRegistrationId || requestedTicketId
                ? 'ไม่พบตั๋วที่ต้องการ หรือรายการนี้ไม่มีอยู่ในบัญชีของคุณ'
                : 'คุณยังไม่มีตั๋วในขณะนี้'}
            </div>
          ) : (
            visibleTickets.map((ticket) => (
              <div className="myticket-card" key={ticket.registrationId ?? ticket.ticketId}>
                <div className="myticket-left">
                  <div className="myticket-badge">
                    {ticket.category} · {ticket.quantity} ใบ
                  </div>

                  <span
                    className={`ticket-status ${
                      ticket.cancelled ? 'ticket-status-cancelled' : ticket.isCheckedIn
                        ? 'ticket-status-checked-in'
                        : 'ticket-status-valid'
                    }`}
                  >
                    {ticket.cancelled ? 'ยกเลิกแล้ว' : ticket.isCheckedIn
                      ? 'เช็กอินแล้ว'
                      : 'ลงทะเบียนแล้ว'}
                  </span>

                  <h2 className="myticket-event-title">
                    {ticket.eventName}
                  </h2>
                </div>

                <div className="myticket-middle">
                  <div className="info-group">
                    <label>วันและเวลา</label>
                    <div className="info-value">
                      {formatDateTime(ticket.startsAt)}
                    </div>
                  </div>

                  <div className="info-group">
                    <label>สถานที่</label>
                    <div className="info-value">
                      {ticket.location}
                    </div>
                  </div>

                  <div className="info-group">
                    <label>ประเภทบัตร</label>
                    <div className="info-value">
                      {ticket.ticketType}
                    </div>
                  </div>

                  <div className="issue-date">
                    ลงทะเบียนเมื่อ {formatDate(ticket.registeredAt)}
                  </div>

                  {ticket.isCheckedIn && ticket.checkedInAt && (
                    <div className="issue-date">
                      เช็กอินเมื่อ {formatDateTime(ticket.checkedInAt)}
                    </div>
                  )}
                </div>

                <div
                  className={`myticket-right ${
                    ticket.isCheckedIn || !ticket.qrCode
                      ? 'myticket-right-disabled'
                      : ''
                  }`}
                  role={ticket.qrCode ? 'button' : undefined}
                  tabIndex={ticket.qrCode ? 0 : undefined}
                  aria-label={
                    ticket.qrCode
                      ? `ขยาย QR Code ของ ${ticket.eventName}`
                      : undefined
                  }
                  onClick={() => openTicketQr(ticket)}
                  onKeyDown={(event) => {
                    if (
                      ticket.qrCode &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      openTicketQr(ticket);
                    }
                  }}
                >
                  {ticket.cancelled ? (
                    <div className="ticket-qr-unavailable">
                      {ticket.cancelReason || 'บัตรนี้ถูกยกเลิกแล้ว'}
                    </div>
                  ) : ticket.isCheckedIn ? (
                    <div className="ticket-qr-unavailable">
                      <div
                        className="ticket-checked-in-icon"
                        aria-hidden="true"
                      >
                        ✓
                      </div>

                      <div className="myticket-id">
                        {ticket.ticketId}
                      </div>

                      <div className="myticket-tap-hint">
                        เช็กอินเรียบร้อยแล้ว! ไม่สามารถใช้ QR นี้ เข้าร่วมงานซ้ำได้
                      </div>
                    </div>
                  ) : ticket.qrCode ? (
                    <>
                      <img
                        src={ticket.qrCode}
                        alt={`QR Code ของ ${ticket.eventName}`}
                        className="myticket-qr-img"
                      />

                      <div className="myticket-id">
                        {ticket.ticketId}
                      </div>

                      <div className="myticket-tap-hint">
                        แตะเพื่อขยาย QR
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="myticket-id">
                        {ticket.ticketId}
                      </div>

                      <div className="myticket-tap-hint">
                        ยังไม่มีรหัส QR จากระบบ
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedTicket && (
          <div
            className="qr-modal-overlay"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="qr-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ticket-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="ticket-modal-title">
                {selectedTicket.eventName}
              </h3>

              <p className="modal-ticket-id">
                {selectedTicket.ticketIdLabel}:{' '}
                {selectedTicket.ticketId}
              </p>

              <div className="modal-qr-wrapper">
                <img
                  src={selectedTicket.qrCode}
                  alt="QR Code สำหรับตรวจสอบบัตร"
                />
              </div>

              <p className="modal-hint">
                แสดง QR Code นี้ให้เจ้าหน้าที่ตรวจสอบ
              </p>

              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedTicket(null)}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
