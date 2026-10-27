import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventService } from '../../api/eventService';
import { registrationService } from '../../api/registrationService';
import '../../EventDetailPage.css';
import QRCode from 'qrcode';
import { mockPaymentService } from '../../api/mockPaymentService';
import { useLocation } from 'react-router-dom';

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
  const status = error?.status ?? error?.response?.status;
  const data = error?.data ?? error?.response?.data;

  const rawMessage =
    typeof data === 'string'
      ? data
      : data?.message || data?.error || data?.detail || error?.message || '';

  const message = String(rawMessage);
  const normalized = message.toLowerCase();

  if (status === 401) {
    return 'กรุณาเข้าสู่ระบบก่อนดำเนินการ';
  }

  if (status === 403) {
    return 'บัญชีของคุณไม่มีสิทธิ์ดำเนินการนี้';
  }

  if (status === 404) {
    return 'ไม่พบกิจกรรมหรือรายการที่ต้องการ กรุณาโหลดข้อมูลใหม่';
  }

  if (status === 409) {
    if (/expir|หมดอายุ/.test(normalized)) {
      return 'รายการชำระเงินหมดอายุแล้ว กรุณาเริ่มรายการใหม่';
    }

    if (/cancel|ยกเลิก/.test(normalized)) {
      return 'รายการนี้ถูกยกเลิกแล้ว ไม่สามารถยืนยันชำระเงินได้';
    }

    if (/price|ราคา/.test(normalized)) {
      return 'ราคาบัตรมีการเปลี่ยนแปลง กรุณาตรวจสอบราคาใหม่';
    }

    if (/capacity|sold.?out|full|ticket.?full|เต็ม/.test(normalized)) {
      return 'บัตรเต็มแล้ว กรุณาโหลดข้อมูลกิจกรรมใหม่';
    }

    if (/already|duplicate|exist|ลงทะเบียนแล้ว|ซ้ำ/.test(normalized)) {
      return 'คุณมีรายการลงทะเบียนสำหรับกิจกรรมนี้อยู่แล้ว';
    }

    if (/pending|checkout|ชำระเงิน/.test(normalized)) {
      return 'มีรายการชำระเงินที่ยังดำเนินการไม่เสร็จ กรุณาตรวจสอบรายการเดิม';
    }

    return message || 'ข้อมูลรายการเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง';
  }

  return message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
};

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();

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
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentQr, setPaymentQr] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [restoredPaymentStatus, setRestoredPaymentStatus] = useState('');

  // โหลดข้อมูลกิจกรรม
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
      setPaymentOrder(null);
      setPaymentQr('');
      setPaymentError('');

      try {
        const data = await eventService.getEventById(eventId);

        if (cancelled) return;

        setEventData(data);

        const loadedTickets = Array.isArray(data?.ticketTypes)
          ? data.ticketTypes
          : [];

        setSelectedTicketId(loadedTickets[0]?.id ?? null);
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
  }, [eventId, location.state?.resumePaymentId]);

  // กู้คืนรายการชำระเงินที่ค้างอยู่เมื่อรีเฟรชหน้า
  useEffect(() => {
    let cancelled = false;

    const restorePendingPayment = async () => {
      const storageKey = `mock-payment:${eventId}`;

      try {
        const resumePaymentId = location.state?.resumePaymentId;
        const saved = window.localStorage.getItem(storageKey);

        let order = saved ? JSON.parse(saved) : null;

        // ถ้ามาจากหน้าประวัติ ให้ใช้ paymentId ที่เลือก
        if (
          resumePaymentId &&
          (!order || String(order.paymentId) !== String(resumePaymentId))
        ) {
          order = { paymentId: resumePaymentId };
        }

        if (!order?.paymentId) return;

        const statusResult = await mockPaymentService.getStatus(
          order.paymentId
        );

        if (cancelled) return;

        const paymentStatus = String(
          statusResult?.status ?? ''
        ).toUpperCase();

        const notExpired =
          order.expiresAt &&
          new Date(order.expiresAt).getTime() > Date.now();

        if (paymentStatus === 'PENDING_PAYMENT' && notExpired) {
          setPaymentOrder(order);
          setPaymentError('');
          setActiveModal('payment');
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // ถ้าตรวจสอบสถานะไม่ได้ อย่าถือว่ารายการสำเร็จ
      }
    };

    restorePendingPayment();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // สร้าง QR จาก payload
  useEffect(() => {
    let cancelled = false;

    const createQr = async () => {
      setPaymentQr('');

      if (!paymentOrder?.qrPayload) return;

      try {
        const dataUrl = await QRCode.toDataURL(paymentOrder.qrPayload, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'M',
        });

        if (!cancelled) {
          setPaymentQr(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPaymentError('ไม่สามารถสร้าง QR สำหรับเดโมได้');
        }
      }
    };

    createQr();

    return () => {
      cancelled = true;
    };
  }, [paymentOrder]);

  // นับเวลาถอยหลัง (แสดงผลเท่านั้น backend เป็นผู้ตัดสินการหมดอายุจริง)
  useEffect(() => {
    if (!paymentOrder?.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const expiry = new Date(paymentOrder.expiresAt).getTime();
      const seconds = Math.max(
        0,
        Math.ceil((expiry - Date.now()) / 1000)
      );

      setRemainingSeconds(seconds);
    };

    updateRemaining();

    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [paymentOrder]);

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

  // ป้องกันการลงทะเบียนเมื่อถึงหรือเลยเวลาเริ่มกิจกรรม
  const startsAtTime = eventData?.startsAt
    ? new Date(eventData.startsAt).getTime()
    : NaN;

  const hasStarted =
    Number.isFinite(startsAtTime) &&
    startsAtTime <= Date.now();

  const spotsLeft = Number(eventData?.spotsLeft ?? 0);

  const eventUnavailable =
    ['FULL', 'ENDED'].includes(status) ||
    spotsLeft <= 0 ||
    hasStarted;

  const alreadyRegistered = Boolean(eventData?.registered);

  const canRegister =
    Boolean(selectedTicket) &&
    ticketRemaining > 0 &&
    !eventUnavailable &&
    !alreadyRegistered;

  const handleRegisterClick = () => {
    if (!canRegister) return;

    // ถ้ามีรายการชำระเงินที่ยังไม่หมดอายุ ให้เปิดกลับมาแทนการสร้างใหม่
    if (paymentOrder && remainingSeconds > 0) {
      setActiveModal('payment');
      return;
    }

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

    const currentStartsAt = eventData?.startsAt
      ? new Date(eventData.startsAt).getTime()
      : NaN;

    const hasEventStarted =
      Number.isFinite(currentStartsAt) &&
      currentStartsAt <= Date.now();

    if (
      ['FULL', 'ENDED'].includes(status) ||
      Number(eventData?.spotsLeft ?? 0) <= 0 ||
      hasEventStarted
    ) {
      setRegisterError(
        'กิจกรรมเริ่มแล้วหรือปิดรับลงทะเบียน ไม่สามารถลงทะเบียนได้'
      );
      return;
    }

    if (qty < 1 || qty > maxQty) {
      setRegisterError('จำนวนบัตรไม่ถูกต้องหรือบัตรมีไม่เพียงพอ');
      return;
    }

    setSubmitting(true);
    setRegisterError('');

    try {
      // บัตรมีราคา: สร้างรายการชำระเงินก่อน
      if (Number(selectedTicket.price ?? 0) > 0) {
        const order = await mockPaymentService.checkout({
          eventId: Number(eventId),
          ticketTypeId: Number(selectedTicket.id),
          quantity: qty,
        });

        setPaymentError('');
        setPaymentOrder(order);
        setActiveModal('payment');

        // เก็บข้อมูลรายการไว้เพื่อกู้คืนได้เมื่อรีเฟรชหน้า
        window.localStorage.setItem(
          `mock-payment:${eventId}`,
          JSON.stringify(order)
        );

        return;
      }

      // บัตรฟรี: ใช้ flow ลงทะเบียนเดิม
      const result = await registrationService.registerForEvent(
        eventId,
        {
          ticketTypeId: selectedTicket.id,
          quantity: qty,
        }
      );

      setRegistrationResult(result);
      setActiveModal('success');

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
          ticketTypes: (previous.ticketTypes ?? []).map((ticket) =>
            String(ticket.id) !== String(selectedTicket.id)
              ? ticket
              : {
                  ...ticket,
                  sold: Number(ticket.sold ?? 0) + qty,
                  remaining: Math.max(
                    0,
                    Number(ticket.remaining ?? 0) - qty
                  ),
                }
          ),
        };
      });
    } catch (error) {
      setRegisterError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentOrder?.paymentId || submitting) return;

    setSubmitting(true);
    setPaymentError('');

    try {
      const result = await mockPaymentService.confirm(
        paymentOrder.paymentId
      );

      if (
        String(result?.paymentStatus ?? '').toUpperCase() !==
        'CONFIRMED'
      ) {
        throw new Error('backend ยังไม่ได้ยืนยันการชำระเงิน');
      }

      // API คืนข้อมูลการลงทะเบียนไว้ใน result.registration
      setRegistrationResult(result.registration ?? null);

      window.localStorage.removeItem(`mock-payment:${eventId}`);

      setPaymentOrder(null);
      setPaymentQr('');
      setActiveModal('success');

      // โหลดข้อมูลกิจกรรมใหม่ เพื่อให้จำนวนบัตรอ้างอิง backend
      try {
        const updatedEvent = await eventService.getEventById(eventId);
        setEventData(updatedEvent);
      } catch {
        // การยืนยันสำเร็จแล้ว ไม่ควรแสดงเป็นการชำระเงินล้มเหลว
      }
    } catch (error) {
      setPaymentError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentOrder?.paymentId || submitting) return;

    setSubmitting(true);
    setPaymentError('');

    try {
      await mockPaymentService.cancel(paymentOrder.paymentId);

      window.localStorage.removeItem(`mock-payment:${eventId}`);

      setPaymentOrder(null);
      setPaymentQr('');
      setActiveModal('booking');
    } catch (error) {
      setPaymentError(getErrorMessage(error));
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

  // ข้อความสถานะที่แสดงบนหน้า User
  const displayStatus = hasStarted
    ? 'ENDED'
    : status === 'OPEN' && spotsLeft > 0
      ? 'OPEN'
      : status === 'ENDED'
        ? 'ENDED'
        : spotsLeft <= 0 || status === 'FULL'
          ? 'FULL'
          : status;

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
          <div className="event-main-content">
            <div className="section-subtitle theme-text">
              {categoryLabels[
                String(eventData.category || '').toUpperCase()
              ] || eventData.category || 'อีเวนต์'}
            </div>

            <h1 className="event-title">{eventData.title}</h1>

            {eventData.status && (
              <p>สถานะ: {statusLabels[displayStatus] || eventData.status}</p>
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

          <div className="event-sidebar">
            <div className="event-booking-card">
              <span className="ticket-label">ที่นั่ง</span>

              <h2 className="ticket-left theme-text">
                เหลือ {spotsLeft} ที่นั่ง
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
                    ? displayStatus === 'ENDED'
                      ? 'กิจกรรมสิ้นสุดแล้ว'
                      : 'ปิดรับลงทะเบียน'
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
                <p style={{ fontSize: 13, color: '#92400e' }}>
                  บัตรนี้ต้องผ่านขั้นตอน Mock Payment ก่อนการลงทะเบียนจะสำเร็จ
                  ระบบนี้เป็นระบบทดสอบ ไม่ใช่การชำระเงินจริง
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
                disabled={
                  submitting ||
                  !selectedTicket ||
                  qty > maxQty ||
                  eventUnavailable
                }
              >
                {submitting
                  ? 'กำลังดำเนินการ...'
                  : Number(selectedTicket?.price ?? 0) > 0
                    ? 'ไปหน้าชำระเงิน'
                    : 'ยืนยันลงทะเบียน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'payment' && paymentOrder && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <button
              type="button"
              className="btn-close-modal"
              onClick={() => {
                if (!submitting) setActiveModal(null);
              }}
              disabled={submitting}
              aria-label="ปิดหน้าต่าง"
            >
              ×
            </button>

            <div className="modal-header">
              <h2 className="modal-title">ชำระเงินสำหรับเดโม</h2>
              <p className="modal-subtitle">{eventData?.title}</p>
            </div>

            <div className="modal-body">
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  color: '#9a3412',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                <strong>ระบบทดสอบเท่านั้น</strong>
                <div>QR นี้ไม่ใช่ QR PromptPay สำหรับโอนเงินจริง</div>
              </div>

              {paymentQr ? (
                <img
                  src={paymentQr}
                  alt="QR Code สำหรับ Mock Payment"
                  width={240}
                  height={240}
                  style={{
                    display: 'block',
                    margin: '0 auto 16px',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              ) : (
                <p>กำลังสร้าง QR...</p>
              )}

              <p style={{ color: '#666', fontSize: 13 }}>
                หมายเลขรายการ: {paymentOrder.paymentId}
              </p>

              <p style={{ fontSize: 14 }}>
                จำนวนบัตร: {paymentOrder.quantity}
              </p>

              <p style={{ fontSize: 22, fontWeight: 'bold' }}>
                {formatMoney(paymentOrder.totalAmount)}{' '}
                {paymentOrder.currency || 'THB'}
              </p>

              <p style={{ color: remainingSeconds > 0 ? '#b45309' : '#dc2626' }}>
                {remainingSeconds > 0
                  ? `เวลาที่เหลือ ${Math.floor(remainingSeconds / 60)}:${String(
                      remainingSeconds % 60
                    ).padStart(2, '0')} นาที`
                  : 'รายการถึงเวลาหมดอายุแล้ว กรุณาตรวจสอบสถานะ'}
              </p>

              {paymentError && (
                <p role="alert" style={{ color: '#dc2626' }}>
                  {paymentError}
                </p>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                className="btn-modal-confirm theme-bg"
                onClick={handleConfirmPayment}
                disabled={submitting || !paymentQr || remainingSeconds <= 0}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  color: '#fff',
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity:
                    submitting || !paymentQr || remainingSeconds <= 0
                      ? 0.6
                      : 1,
                }}
              >
                {submitting ? 'กำลังตรวจสอบ...' : 'ยืนยันการชำระเงิน (Demo)'}
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                ยกเลิกรายการ
              </button>
            </div>
          </div>
        </div>
      )}

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
