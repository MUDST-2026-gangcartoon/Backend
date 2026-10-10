import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import Navbar from '../../components/Navbar';
import { registrationService } from '../../api/registrationService';
import './MyTicketsPage.css';

const CATEGORY_LABELS = {
  TECH: 'ไอที',
  DESIGN: 'ออกแบบ',
  CAREER: 'อาชีพ',
  COMMUNITY: 'ชุมชน',
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุวันเวลา';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'ไม่ระบุวันเวลา';
  }

  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatDate = (dateString) => {
  if (!dateString) return 'ไม่ระบุวันที่';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'ไม่ระบุวันที่';
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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

  return {
    ticketId: ticketCode || String(registration.id ?? ''),
    ticketCode,
    ticketIdLabel: ticketCode ? 'รหัสบัตร' : 'รหัสลงทะเบียน',
    eventName: event.title || 'ไม่พบชื่ออีเวนต์',
    category: CATEGORY_LABELS[event.category] || event.category || 'อีเวนต์',
    startsAt: event.startsAt,
    location: event.location || 'ไม่ระบุสถานที่',
    ticketType: registration.ticketTypeName || 'ไม่ระบุประเภทบัตร',
    registeredAt: registration.registeredAt,
    quantity: registration.quantity ?? 1,
  };
};

export default function MyTicketsPage() {
  const [searchParams] = useSearchParams();
  const requestedTicketId = searchParams.get('ticketId');

  const [tickets, setTickets] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await registrationService.getMyRegistrations();
        const payload = response?.data ?? response;

        const items = Array.isArray(payload)
          ? payload
          : payload?.items ?? payload?.registrations ?? [];

        const normalizedTickets = Array.isArray(items)
          ? items.map(normalizeRegistration).filter(
              (ticket) => ticket.ticketId
            )
          : [];

        // สร้าง QR ในเครื่องจาก ticketCode ที่ Backend ส่งกลับมา
        const qrEntries = await Promise.all(
          normalizedTickets
            .filter((ticket) => ticket.ticketCode)
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
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setTickets([]);
          setQrCodes({});
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
  }, []);

  const ticketsWithQr = tickets.map((ticket) => ({
    ...ticket,
    qrCode: qrCodes[ticket.ticketId] || '',
  }));

  const visibleTickets = requestedTicketId
    ? ticketsWithQr.filter(
        (ticket) => ticket.ticketId === requestedTicketId
      )
    : ticketsWithQr;

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
            <div className="empty-state">
              กำลังโหลดตั๋วของคุณ...
            </div>
          ) : errorMessage ? (
            <div className="empty-state" role="alert">
              {errorMessage}
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="empty-state">
              {requestedTicketId
                ? 'ไม่พบตั๋วที่ต้องการ หรือรายการนี้ไม่มีอยู่ในบัญชีของคุณ'
                : 'คุณยังไม่มีตั๋วในขณะนี้'}
            </div>
          ) : (
            visibleTickets.map((ticket) => (
              <div className="myticket-card" key={ticket.ticketId}>
                <div className="myticket-left">
                  <div className="myticket-badge">
                    {ticket.category} · {ticket.quantity} ใบ
                  </div>

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
                </div>

                <div
                  className="myticket-right"
                  role={ticket.qrCode ? 'button' : undefined}
                  tabIndex={ticket.qrCode ? 0 : undefined}
                  aria-label={
                    ticket.qrCode
                      ? `ขยาย QR Code ของ ${ticket.eventName}`
                      : undefined
                  }
                  onClick={() => {
                    if (ticket.qrCode) {
                      setSelectedTicket(ticket);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      ticket.qrCode &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      setSelectedTicket(ticket);
                    }
                  }}
                >
                  {ticket.qrCode ? (
                    <>
                      <img
                        src={ticket.qrCode}
                        alt="QR Code ของบัตร"
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
                {selectedTicket.ticketIdLabel}: {selectedTicket.ticketId}
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