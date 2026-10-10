
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventService } from '../../api/eventService';
import { registrationService } from '../../api/registrationService';
import '../../EventDetailPage.css';

const categoryLabels = {
  TECH: 'เทคโนโลยี',
  DESIGN: 'ออกแบบ',
  CAREER: 'อาชีพ',
  COMMUNITY: 'คอมมูนิตี้',
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const dateText = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeText = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateText} • ${timeText}`;
};

const formatMoney = (value) =>
  Number(value ?? 0).toLocaleString('th-TH');

const getErrorMessage = (error) => {
  const message = String(error?.message || '');
  const status = error?.status ?? error?.response?.status;

  if (
    status === 401 ||
    status === 403 ||
    /\b401\b|\b403\b/.test(message)
  ) {
    return 'กรุณาเข้าสู่ระบบก่อนลงทะเบียน';
  }

  return message || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
};

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [qty, setQty] = useState(1);

  const [showOrganizer, setShowOrganizer] = useState(true);
  const [showTickets, setShowTickets] = useState(true);

  const [activeModal, setActiveModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  // โหลดรายละเอียดอีเวนต์จาก Backend
  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      setLoading(true);
      setLoadError('');
      setEventData(null);
      setSelectedTicketId(null);
      setQty(1);
      setActiveModal(null);
      setRegisterError('');

      try {
        const data = await eventService.getEventById(eventId);

        if (cancelled) return;

        setEventData(data);

        const tickets = Array.isArray(data?.ticketTypes)
          ? data.ticketTypes
          : [];

        setSelectedTicketId(tickets[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message || 'ไม่สามารถโหลดรายละเอียดอีเวนต์ได้'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const tickets = Array.isArray(eventData?.ticketTypes)
    ? eventData.ticketTypes
    : [];

  const selectedTicket =
    tickets.find(
      (ticket) => String(ticket.id) === String(selectedTicketId)
    ) ?? tickets[0] ?? null;

  const totalPrice = Number(selectedTicket?.price ?? 0) * qty;

  const ticketRemaining = selectedTicket
    ? Number(selectedTicket.remaining ?? 0)
    : 0;

  const maxQty = Math.min(10, Math.max(0, ticketRemaining));

  const status = String(eventData?.status || '').toUpperCase();

  const eventUnavailable =
    ['FULL', 'ENDED'].includes(status) ||
    Number(eventData?.spotsLeft ?? 1) <= 0;

  const alreadyRegistered = Boolean(eventData?.registered);

  const canRegister =
    Boolean(selectedTicket) &&
    ticketRemaining > 0 &&
    !eventUnavailable &&
    !alreadyRegistered;

  const handleRegisterClick = () => {
    if (!canRegister) return;

    setQty(1);
    setRegisterError('');
    setRegistrationResult(null);
    setActiveModal('booking');
  };

  const handleQtyChange = (change) => {
    setQty((current) => {
      const next = current + change;

      if (next < 1 || next > maxQty) {
        return current;
      }

      return next;
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedTicket || submitting) return;

    if (qty < 1 || qty > maxQty) {
      setRegisterError('จำนวนบัตรไม่ถูกต้องหรือบัตรมีไม่เพียงพอ');
      return;
    }

    setSubmitting(true);
    setRegisterError('');

    try {
      // ส่งคำขอลงทะเบียนจริงไปยัง Backend
      const result = await registrationService.registerForEvent(
        eventId,
        {
          ticketTypeId: selectedTicket.id,
          quantity: qty,
        }
      );

      setRegistrationResult(result);
      setActiveModal('success');

      // อัปเดตข้อมูลบนหน้าจอหลังลงทะเบียนสำเร็จ
      setEventData((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          registered: true,
          registeredCount:
            Number(previous.registeredCount ?? 0) + qty,
          spotsLeft: Math.max(
            0,
            Number(previous.spotsLeft ?? 0) - qty
          ),
          ticketTypes: (previous.ticketTypes ?? []).map((ticket) => {
            if (String(ticket.id) !== String(selectedTicket.id)) {
              return ticket;
            }

            return {
              ...ticket,
              sold: Number(ticket.sold ?? 0) + qty,
              remaining: Math.max(
                0,
                Number(ticket.remaining ?? 0) - qty
              ),
            };
          }),
        };
      });
    } catch (error) {
      setRegisterError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          กำลังโหลดข้อมูลอีเวนต์...
        </div>
      </>
    );
  }

  if (loadError || !eventData) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: 'center', margin: '100px 20px' }}>
          <p style={{ color: '#dc2626' }}>
            {loadError || 'ไม่พบข้อมูลอีเวนต์'}
          </p>
          <button className="btn-back" onClick={() => navigate(-1)}>
            ← กลับไปดูอีเวนต์
          </button>
        </div>
      </>
    );
  }

  const description = eventData.description || '';
  const descriptionParagraphs = description
    .split(/\n+/)
    .filter((paragraph) => paragraph.trim());

  const registeredCount = Number(eventData.registeredCount ?? 0);
  const capacity = Number(eventData.capacity ?? 0);

  const statusLabels = {
    OPEN: 'เปิดรับลงทะเบียน',
    FULL: 'เต็มแล้ว',
    ENDED: 'สิ้นสุดแล้ว',
    REGISTERED: 'ลงทะเบียนแล้ว',
  };

  const ticketCode = registrationResult?.ticketCode;
  const registrationId = registrationResult?.id;

  return (
    <>
      <Navbar />

      <div className="event-detail-page">
        <div className="back-link-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            &larr; กลับไปดูอีเวนต์
          </button>
        </div>

        <div className="event-content-wrapper">
          {/* ฝั่งซ้าย: รายละเอียดอีเวนต์ */}
          <div className="event-main-content">
            <div className="section-subtitle theme-text">
              {categoryLabels[String(eventData.category || '').toUpperCase()]
                || eventData.category
                || 'อีเวนต์'}
            </div>

            <h1 className="event-title">{eventData.title}</h1>

            {eventData.status && (
              <p>
                สถานะ: {statusLabels[status] || eventData.status}
              </p>
            )}

            <div className="info-row">
              <div className="info-item">
                <div className="info-icon">🕒</div>
                <div>
                  <div className="info-label">วันและเวลา</div>
                  <div className="info-value">
                    {formatDateTime(eventData.startsAt)}
                  </div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">📍</div>
                <div>
                  <div className="info-label">สถานที่</div>
                  <div className="info-value">
                    {eventData.location || '-'}
                  </div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">👥</div>
                <div>
                  <div className="info-label">จำนวนที่นั่ง</div>
                  <div className="info-value">
                    ลงทะเบียนแล้ว {registeredCount}
                    {capacity > 0 ? ` / ${capacity}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <hr className="divider" />

            <div className="event-description">
              <div className="section-subtitle theme-text">
                รายละเอียดอีเวนต์
              </div>

              <h2>เกี่ยวกับกิจกรรมนี้</h2>

              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p>ยังไม่มีรายละเอียดเพิ่มเติมสำหรับอีเวนต์นี้</p>
              )}
            </div>

            <hr className="divider" />

            <div className="event-organizer">
              <div className="org-header">
                <h3>👥 ผู้จัดอีเวนต์</h3>
                <button
                  className="btn-text-theme"
                  onClick={() => setShowOrganizer((current) => !current)}
                >
                  {showOrganizer ? 'ซ่อนข้อมูลผู้จัด >' : 'แสดงข้อมูลผู้จัด >'}
                </button>
              </div>

              {showOrganizer && (
                <div className="org-profile">
                  {eventData.organizer ? (
                    <>
                      <div className="org-avatar theme-bg">
                        {eventData.organizer.avatarLetter || '?'}
                      </div>
                      <div className="org-info">
                        <div className="org-label theme-text">
                          {eventData.organizer.tag || 'ผู้จัดอีเวนต์'}
                        </div>
                        <div className="org-name">
                          {eventData.organizer.name || 'ไม่ระบุชื่อผู้จัด'}
                        </div>
                        <div className="org-desc">
                          {eventData.organizer.bio || ''}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="org-info">
                      <div className="org-desc">
                        ยังไม่มีข้อมูลผู้จัดสำหรับอีเวนต์นี้
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ฝั่งขวา: ประเภทบัตรและการลงทะเบียน */}
          <div className="event-sidebar">
            <div className="event-booking-card">
              <span className="ticket-label">ที่นั่ง</span>

              <h2 className="ticket-left theme-text">
                เหลือ {Number(eventData.spotsLeft ?? 0)} ที่นั่ง
              </h2>

              <p className="ticket-reg">
                ลงทะเบียนแล้ว {registeredCount}
                {capacity > 0 ? ` / ${capacity}` : ''}
              </p>

              <div className="ticket-divider" />

              <button
                type="button"
                className="ticket-types-toggle"
                onClick={() => setShowTickets((current) => !current)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: '16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <span>
                  🎟️ {showTickets ? 'ซ่อนประเภทบัตร' : 'แสดงประเภทบัตร'}
                </span>
                <span>{showTickets ? '˅' : '›'}</span>
              </button>

              {showTickets && (
                <div className="ticket-list">
                  {tickets.length > 0 ? (
                    tickets.map((ticket) => (
                      <div className="ticket-item" key={ticket.id}>
                        <div className="t-info">
                          <div className="t-name">{ticket.name}</div>
                          <div className="t-desc">
                            {ticket.description || ''}
                          </div>
                          <div className="t-desc">
                            {Number(ticket.remaining ?? 0) > 0
                              ? `เหลือ ${ticket.remaining} ใบ`
                              : 'บัตรหมด'}
                          </div>
                        </div>

                        <div className="t-price theme-text">
                          {Number(ticket.price ?? 0) === 0
                            ? 'ฟรี'
                            : `฿${formatMoney(ticket.price)}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>อีเวนต์นี้ยังไม่มีข้อมูลประเภทบัตร</p>
                  )}
                </div>
              )}

              <button
                className="btn-register theme-bg"
                onClick={handleRegisterClick}
                disabled={!canRegister}
                style={{
                  opacity: canRegister ? 1 : 0.55,
                  cursor: canRegister ? 'pointer' : 'not-allowed',
                }}
              >
                {alreadyRegistered
                  ? 'ลงทะเบียนแล้ว'
                  : eventUnavailable
                    ? 'ปิดรับลงทะเบียน'
                    : !selectedTicket
                      ? 'ไม่มีประเภทบัตร'
                      : ticketRemaining <= 0
                        ? 'บัตรหมด'
                        : 'ลงทะเบียน →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal เลือกบัตรและยืนยันลงทะเบียน */}
      {activeModal === 'booking' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box">
            <button
              className="btn-close-modal"
              onClick={() => setActiveModal(null)}
              disabled={submitting}
            >
              ✕
            </button>

            <div className="modal-header">
              <h2 className="modal-title">
                ลงทะเบียน: {eventData.title}
              </h2>
              <p className="modal-subtitle">
                {formatDateTime(eventData.startsAt)}
              </p>
            </div>

            <div className="modal-body">
              <label className="section-label">เลือกประเภทบัตร</label>

              <div className="ticket-options">
                {tickets.map((ticket) => {
                  const isSelected =
                    String(selectedTicket?.id) === String(ticket.id);

                  const remaining = Number(ticket.remaining ?? 0);

                  return (
                    <button
                      type="button"
                      key={ticket.id}
                      className={`modal-ticket-card ${
                        isSelected ? 'active' : ''
                      }`}
                      disabled={remaining <= 0 || submitting}
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setQty(1);
                        setRegisterError('');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: remaining > 0 ? 'pointer' : 'not-allowed',
                        opacity: remaining > 0 ? 1 : 0.55,
                      }}
                    >
                      <div>
                        <div className="t-name">{ticket.name}</div>
                        <div className="t-desc">
                          {ticket.description || ''}
                        </div>
                        <div className="t-desc">
                          {remaining > 0 ? `เหลือ ${remaining} ใบ` : 'บัตรหมด'}
                        </div>
                      </div>

                      <div className="t-price theme-text">
                        {Number(ticket.price ?? 0) === 0
                          ? 'ฟรี'
                          : `฿${formatMoney(ticket.price)}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="qty-section">
                <span>จำนวนบัตร</span>

                <div className="qty-controls">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={qty <= 1 || submitting}
                  >
                    −
                  </button>

                  <input type="text" value={qty} readOnly />

                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= maxQty || submitting}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="total-section">
                <span>รวมทั้งหมด</span>
                <span
                  className="theme-text"
                  style={{ fontSize: '20px', fontWeight: 'bold' }}
                >
                  ฿{formatMoney(totalPrice)}
                </span>
              </div>

              {Number(selectedTicket?.price ?? 0) > 0 && (
                <p style={{ fontSize: '13px', color: '#92400e' }}>
                  หมายเหตุ: ระบบชำระเงินออนไลน์ยังไม่ได้เชื่อมต่อ
                  การยืนยันนี้จะส่งคำขอลงทะเบียนเท่านั้น
                </p>
              )}

              {registerError && (
                <p
                  role="alert"
                  style={{ color: '#dc2626', marginTop: '12px' }}
                >
                  {registerError}
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-confirm theme-bg"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
                onClick={handleConfirmBooking}
                disabled={submitting || !selectedTicket || qty > maxQty}
              >
                {submitting ? 'กำลังลงทะเบียน...' : 'ยืนยันลงทะเบียน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ลงทะเบียนสำเร็จจากผลตอบกลับของ Backend */}
      {activeModal === 'success' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              ✅
            </div>

            <h2 className="modal-title">ลงทะเบียนสำเร็จ!</h2>

            <p style={{ marginTop: '8px', color: '#666' }}>
              ระบบบันทึกการลงทะเบียนของคุณเรียบร้อยแล้ว
            </p>

            {ticketCode && (
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '16px',
                  borderRadius: '8px',
                  margin: '24px 0',
                }}
              >
                <p style={{ fontSize: '14px', color: '#666' }}>
                  รหัสบัตร
                </p>
                <h3
                  className="theme-text"
                  style={{ margin: 0, letterSpacing: '1px' }}
                >
                  {ticketCode}
                </h3>
              </div>
            )}

            {!ticketCode && registrationId != null && (
              <p style={{ margin: '24px 0' }}>
                หมายเลขการลงทะเบียน: {registrationId}
              </p>
            )}

            <button
              className="btn-modal-confirm theme-bg"
              onClick={() => {
                setActiveModal(null);
                setRegistrationResult(null);
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
