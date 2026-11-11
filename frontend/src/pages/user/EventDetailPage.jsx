import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventService } from '../../api/eventService';
import { registrationService } from '../../api/registrationService';
import { guestService } from '../../api/guestService';
import '../../EventDetailPage.css';
import QRCode from 'qrcode';
import { mockPaymentService } from '../../api/mockPaymentService';
import { useAuth } from '../../context/AuthContext';
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS, EVENT_TIME_ZONE, parseEventDateTime } from './eventDisplay';
import { getRegistrationItems, isCancelledRegistration } from './registrationDisplay';

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = parseEventDateTime(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const dateText = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: EVENT_TIME_ZONE,
  });

  const timeText = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: EVENT_TIME_ZONE,
  });

  return `${dateText} • ${timeText} น. (เวลาไทย)`;
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

    if (/pending|checkout|ชำระเงิน/.test(normalized)) {
      return 'มีรายการชำระเงินที่ยังดำเนินการไม่เสร็จ กรุณาตรวจสอบรายการเดิม';
    }

    if (/already|duplicate|exist|ลงทะเบียนแล้ว|ซ้ำ/.test(normalized)) {
      return 'คุณมีรายการลงทะเบียนสำหรับกิจกรรมนี้อยู่แล้ว';
    }

    return message || 'ข้อมูลรายการเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง';
  }

  return message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
};

const newId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const storeGuest = (key, value) => { try { if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); } catch {} };

const canBuyTicket = (ticket) => ticket.salesEnabled !== false && Number(ticket.remaining) > 0;

const isUncertainResult = (error) =>
  !error?.status || error.status === 408 || error.status >= 500;

async function findActiveRegistration(eventId, registrationId) {
  const registrations = getRegistrationItems(await registrationService.getMyRegistrations());
  return registrations.find((item) =>
    !isCancelledRegistration(item) &&
    String(item.event?.id) === String(eventId) &&
    (registrationId == null || String(item.id) === String(registrationId))
  );
}

async function findPendingPayment(eventId) {
  for (let page = 0; ; page += 1) {
    const result = await mockPaymentService.getHistory(page, 'PENDING_PAYMENT');
    if (!Array.isArray(result?.items) || !Number.isInteger(result.totalPages)) {
      throw new Error('ไม่สามารถตรวจสอบรายการรอชำระเงินได้');
    }
    const pending = result.items.find((item) => String(item.eventId) === String(eventId));
    if (pending) return pending;
    if (page + 1 >= result.totalPages) return null;
  }
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  return <EventDetails key={eventId} eventId={eventId} />;
}

function EventDetails({ eventId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAuthLoading, openModal } = useAuth();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState('');

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [qty, setQty] = useState(1);

  const [showOrganizer, setShowOrganizer] = useState(true);
  const [showTickets, setShowTickets] = useState(true);

  const [activeModal, setActiveModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [paymentNeedsReview, setPaymentNeedsReview] = useState(false);
  const busy = useRef(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentQr, setPaymentQr] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [receiptQr, setReceiptQr] = useState('');
  const [guestRetry, setGuestRetry] = useState(false);
  const pendingGuest = useRef(null);
  const attempt = useRef(null);
  const guestStorageKey = `eventhub:guest:${eventId}`;
  useEffect(() => { attempt.current = null; pendingGuest.current = null; setGuestRetry(false); setPaymentOrder(null); setRegistrationResult(null); setActiveModal(null); }, [isLoggedIn]);

  useEffect(() => {
    if (isAuthLoading || isLoggedIn || !eventData) return;
    let cancelled = false;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(guestStorageKey)); } catch { return; }
    if (!saved?.id || !['payment', 'receipt'].includes(saved.type)) return;
    const load = saved.type === 'payment' ? guestService.payment(saved.id) : guestService.receipt(saved.id);
    load.then((result) => {
      if (cancelled) return;
      if (saved.type === 'payment' && result.status === 'PENDING_PAYMENT') {
        setPaymentOrder(result); setActiveModal('payment');
      } else if (saved.type === 'payment' && result.registration) {
        showRegistration(result.registration);
      } else if (saved.type === 'receipt') {
        setRegistrationResult(result); setActiveModal('success');
      } else storeGuest(guestStorageKey, null);
    }).catch((error) => { if (!cancelled) { if (error.status === 404) storeGuest(guestStorageKey, null); else setRegisterError('ไม่สามารถโหลดรายการเดิมได้ กรุณาโหลดหน้าใหม่เพื่อลองอีกครั้ง'); } });
    return () => { cancelled = true; };
  }, [eventId, isLoggedIn, isAuthLoading, Boolean(eventData)]);

  useEffect(() => {
    let cancelled = false;
    setReceiptQr('');
    if (registrationResult?.ticketCode && registrationResult.status !== 'CANCELLED' && !registrationResult.checkedInAt) {
      QRCode.toDataURL(registrationResult.ticketCode, { width: 240, margin: 2 }).then((url) => {
        if (!cancelled) setReceiptQr(url);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [registrationResult]);

  // โหลดข้อมูลกิจกรรม
  useEffect(() => {
    let cancelled = false;

    const loadEvent = async () => {
      setLoading(true);
      setLoadError('');
      setInventoryError('');
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

        setSelectedTicketId(loadedTickets.find(canBuyTicket)?.id ?? null);
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
  }, [eventId, reloadKey]);

  // Resume by ID through the owner-checked API. The server returns the QR payload.
  const resumePaymentId = location.state?.resumePaymentId;
  const hasEventData = Boolean(eventData);
  useEffect(() => {
    if (!isLoggedIn || !hasEventData || !resumePaymentId) return;
    let cancelled = false;
    const resume = async () => {
      try {
        const order = await mockPaymentService.resume(resumePaymentId);
        if (cancelled) return;
        if (String(order.eventId) !== String(eventId)) {
          throw new Error('รายการชำระเงินนี้ไม่ตรงกับกิจกรรมที่เปิดอยู่');
        }
        setPaymentOrder(order);
        setPaymentError('');
        setActiveModal('payment');
      } catch (error) {
        if (!cancelled) setRegisterError(getErrorMessage(error));
      }
    };
    resume();
    return () => { cancelled = true; };
  }, [eventId, hasEventData, isLoggedIn, resumePaymentId]);

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
      const expiry = parseEventDateTime(paymentOrder.expiresAt).getTime();
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

  const resumeBooking = location.state?.resumeBooking;
  useEffect(() => {
    if (!isLoggedIn || !eventData || !resumeBooking) return;
    const { resumeBooking: intent, ...state } = location.state;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, {
      replace: true,
      state,
    });

    const availableTickets = (eventData.ticketTypes ?? []).filter(canBuyTicket);
    const ticket = availableTickets.find((item) => String(item.id) === String(intent.ticketId));
    const eventSeats = Number(eventData.spotsLeft);
    if (ticket) {
      setSelectedTicketId(ticket.id);
      setQty(Math.max(1, Math.min(10, intent.quantity, Number(ticket.remaining), eventSeats)));
    }
    if (eventData.status === 'OPEN' && !eventData.registered && eventSeats > 0 && availableTickets.length) {
      setActiveModal((current) => current ?? 'booking');
    }
  }, [eventData, isLoggedIn, location, navigate, resumeBooking]);

  const tickets = Array.isArray(eventData?.ticketTypes)
    ? eventData.ticketTypes
    : [];

  const selectedTicket =
    tickets.find(
      (ticket) => String(ticket.id) === String(selectedTicketId)
    ) ?? tickets.find(canBuyTicket) ?? tickets[0] ?? null;

  const totalPrice = Number(selectedTicket?.price ?? 0) * qty;

  const ticketRemaining = selectedTicket
    ? Number(selectedTicket.remaining ?? 0)
    : 0;

  const status = String(eventData?.status || '').toUpperCase();
  const spotsLeft = Number(eventData?.spotsLeft ?? 0);
  const maxQty = Math.max(0, Math.min(10, ticketRemaining, spotsLeft));
  const eventUnavailable = status !== 'OPEN' || spotsLeft <= 0;
  const canChooseTicket = tickets.some(canBuyTicket);
  const checkPaymentFirst = paymentNeedsReview || !(remainingSeconds > 0);

  const alreadyRegistered = Boolean(eventData?.registered);

  const canRegister =
    canChooseTicket &&
    !eventUnavailable &&
    !alreadyRegistered;

  const ensureAttempt = () => {
    if (!attempt.current || Date.now() - attempt.current.created > 15 * 60 * 1000) {
      const attemptId = newId();
      attempt.current = { id: attemptId, created: Date.now(), started: guestService.startAttempt(eventId, attemptId).then(() => true).catch(() => false) };
    }
    return attempt.current;
  };
  const handleRegisterClick = () => {
    if ((!canRegister && !guestRetry) || busy.current) return;
    if (!guestRetry) ensureAttempt();

    // ถ้ามีรายการชำระเงินที่ยังไม่หมดอายุ ให้เปิดกลับมาแทนการสร้างใหม่
    if (paymentOrder && remainingSeconds > 0) {
      setActiveModal('payment');
      return;
    }

    if (!guestRetry) setQty(1);
    setRegisterError('');
    setRegistrationResult(null);
    setActiveModal('booking');
  };

  const handleQtyChange = (change) => {
    setQty((current) => {
      const next = current + change;

      if (next < 1 || (change > 0 && next > maxQty)) {
        return current;
      }

      return next;
    });
  };

  const refreshInventory = async () => {
    try {
      const latest = await eventService.getEventById(eventId);
      setEventData(latest);
      setInventoryError('');
      return latest;
    } catch {
      setInventoryError('ตรวจสอบจำนวนที่นั่งล่าสุดไม่ได้ กรุณาลองโหลดข้อมูลอีกครั้ง');
      return null;
    }
  };

  const showRegistration = (registration) => {
    setRegistrationResult(registration);
    attempt.current = null;
    if (!isLoggedIn && registration?.registrationId) storeGuest(guestStorageKey, { type: 'receipt', id: registration.registrationId });
    pendingGuest.current = null; setGuestRetry(false);
    setPaymentOrder(null);
    setPaymentQr('');
    setPaymentNeedsReview(false);
    setActiveModal('success');
  };

  const withBookingLock = async (action) => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    try {
      await action();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const recoverPendingPayment = async () => {
    const pending = await findPendingPayment(eventId);
    if (!pending) return false;
    const order = await mockPaymentService.resume(pending.paymentId);
    setPaymentError('');
    setPaymentNeedsReview(false);
    setPaymentOrder(order);
    setActiveModal('payment');
    return true;
  };

  const handleConfirmBooking = () => withBookingLock(async () => {
    if (!selectedTicket && !pendingGuest.current) return;
    setRegisterError('');
    if (!isLoggedIn) {
      if (!pendingGuest.current && (!guestName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))) {
        setRegisterError('กรุณากรอกชื่อและอีเมลที่ถูกต้อง'); return;
      }
      try {
        if (!pendingGuest.current) {
          const latest = await refreshInventory();
          if (!latest) return;
          const ticket = (latest.ticketTypes ?? []).find((item) => String(item.id) === String(selectedTicket.id));
          if (latest.status !== 'OPEN' || !ticket || !canBuyTicket(ticket) || qty > Math.min(10, Number(ticket.remaining), Number(latest.spotsLeft)) || Number(ticket.price) !== Number(selectedTicket.price)) {
            setRegisterError('ข้อมูลบัตรหรือจำนวนที่นั่งเปลี่ยนไป กรุณาตรวจสอบอีกครั้ง'); return;
          }
          const currentAttempt = ensureAttempt();
          const tracked = currentAttempt && await currentAttempt.started;
          pendingGuest.current = { key: newId(), paid: Number(selectedTicket.price) > 0,
            payload: { displayName: guestName.trim(), email: guestEmail.trim(), ticketTypeId: selectedTicket.id, quantity: qty, ...(tracked ? { attemptId: currentAttempt.id } : {}) } };
        }
        const pending = pendingGuest.current;
        const result = await (pending.paid ? guestService.checkout(eventId, pending.payload, pending.key) : guestService.register(eventId, pending.payload, pending.key));
        pendingGuest.current = null; setGuestRetry(false);
        if (pending.paid) {
          storeGuest(guestStorageKey, { type: 'payment', id: result.paymentId });
          setPaymentOrder(result); setPaymentError(''); setPaymentNeedsReview(false); setActiveModal('payment');
        } else showRegistration(result);
        await refreshInventory();
      } catch (error) {
        if (isUncertainResult(error)) { setGuestRetry(true); setRegisterError('ยังยืนยันผลไม่ได้ กดลองอีกครั้งเพื่อตรวจสอบรายการเดิม'); }
        else { pendingGuest.current = null; setGuestRetry(false); setRegisterError(getErrorMessage(error)); }
      }
      return;
    }

    const latest = await refreshInventory();
    if (!latest) return;

    const paid = Number(selectedTicket.price ?? 0) > 0;
    try {
      // Check server state before re-sending a booking or checkout after a lost response.
      if (latest.registered) {
        const registration = await findActiveRegistration(eventId);
        if (registration) showRegistration(registration);
        else setRegisterError('คุณมีรายการลงทะเบียนอยู่แล้ว กรุณาตรวจสอบในประวัติ');
        return;
      }
      if (paid && await recoverPendingPayment()) return;

      const latestTicket = (latest.ticketTypes ?? []).find((item) =>
        String(item.id) === String(selectedTicket.id)
      );
      if (latest.status !== 'OPEN' || !latestTicket || !canBuyTicket(latestTicket)) {
        setRegisterError('กิจกรรมหรือบัตรประเภทนี้ปิดรับลงทะเบียนแล้ว');
        return;
      }
      const available = Math.min(10, Number(latestTicket.remaining), Number(latest.spotsLeft));
      if (qty < 1 || qty > available) {
        setRegisterError('จำนวนบัตรเกินที่ว่างล่าสุด กรุณาปรับจำนวนบัตร');
        return;
      }
      if (Number(latestTicket.price) !== Number(selectedTicket.price)) {
        setRegisterError('ราคาบัตรมีการเปลี่ยนแปลง กรุณาตรวจสอบราคาใหม่');
        return;
      }

      const currentAttempt = ensureAttempt();
      const tracked = currentAttempt && await currentAttempt.started;
      const payload = { ticketTypeId: latestTicket.id, quantity: qty, ...(tracked ? { attemptId: currentAttempt.id } : {}) };
      if (paid) {
        const order = await mockPaymentService.checkout({ eventId: Number(eventId), ...payload });
        setPaymentError('');
        setPaymentNeedsReview(false);
        setPaymentOrder(order);
        setActiveModal('payment');
      } else {
        showRegistration(await registrationService.registerForEvent(eventId, payload));
      }
      await refreshInventory();
    } catch (error) {
      if (isUncertainResult(error)) {
        try {
          const registration = await findActiveRegistration(eventId);
          if (registration) {
            showRegistration(registration);
            await refreshInventory();
            return;
          }
          if (paid && await recoverPendingPayment()) {
            await refreshInventory();
            return;
          }
        } catch {
          // The next submission will recheck server state before sending any write.
        }
        setRegisterError('ยังยืนยันผลไม่ได้ ระบบจะตรวจรายการเดิมก่อนดำเนินการครั้งถัดไป');
      } else {
        setRegisterError(getErrorMessage(error));
      }
      await refreshInventory();
    }
  });

  const checkPaymentStatus = async (paymentId) => {
    const result = await (isLoggedIn ? mockPaymentService.getStatus(paymentId) : guestService.payment(paymentId));
    if (result.status === 'CONFIRMED') {
      const registration = isLoggedIn ? await findActiveRegistration(eventId, result.registrationId).catch(() => null) : result.registration;
      showRegistration(registration ?? { id: result.registrationId });
    } else if (result.status === 'CANCELLED' || result.status === 'EXPIRED') {
      setPaymentOrder(null);
      if (!isLoggedIn) { storeGuest(guestStorageKey, null); attempt.current = null; }
      setPaymentQr('');
      setActiveModal('booking');
      setRegisterError(result.status === 'CANCELLED' ? 'รายการชำระเงินถูกยกเลิกแล้ว' : 'รายการชำระเงินหมดอายุแล้ว');
    } else if (result.status !== 'PENDING_PAYMENT') {
      throw new Error('ยังไม่ทราบสถานะของรายการชำระเงิน');
    }
    setPaymentNeedsReview(false);
    await refreshInventory();
    return result.status;
  };

  const handleConfirmPayment = () => withBookingLock(async () => {
    if (!paymentOrder?.paymentId) return;
    setPaymentError('');
    try {
      if (checkPaymentFirst) {
        await checkPaymentStatus(paymentOrder.paymentId);
        return;
      }
      const result = await (isLoggedIn ? mockPaymentService.confirm(paymentOrder.paymentId) : guestService.confirmPayment(paymentOrder.paymentId));
      if ((isLoggedIn ? result.paymentStatus : result.status) !== 'CONFIRMED') {
        throw new Error('ยังไม่ได้รับการยืนยันการชำระเงิน');
      }
      showRegistration(result.registration);
      await refreshInventory();
    } catch (error) {
      await reconcilePaymentError(error);
    }
  });

  const handleCancelPayment = () => withBookingLock(async () => {
    if (!paymentOrder?.paymentId) return;
    setPaymentError('');
    try {
      await (isLoggedIn ? mockPaymentService.cancel(paymentOrder.paymentId) : guestService.cancelPayment(paymentOrder.paymentId));
      setPaymentOrder(null);
      if (!isLoggedIn) { storeGuest(guestStorageKey, null); attempt.current = null; }
      setPaymentQr('');
      setActiveModal('booking');
      setPaymentNeedsReview(false);
      await refreshInventory();
    } catch (error) {
      await reconcilePaymentError(error);
    }
  });

  const reconcilePaymentError = async (error) => {
    setPaymentError(getErrorMessage(error));
    if (isUncertainResult(error) || error.status === 409) {
      try {
        await checkPaymentStatus(paymentOrder.paymentId);
      } catch {
        setPaymentNeedsReview(true);
        setPaymentError('ตรวจสอบผลการชำระเงินไม่ได้ กรุณาตรวจสอบสถานะก่อนลองใหม่');
      }
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
          <p role="alert" style={{ color: '#dc2626' }}>
            {loadError || 'ไม่พบข้อมูลอีเวนต์'}
          </p>
          <button type="button" className="btn-back" onClick={() => setReloadKey((key) => key + 1)}>
            ลองโหลดอีกครั้ง
          </button>
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
              {EVENT_CATEGORY_LABELS[
                String(eventData.category || '').toUpperCase()
              ] || eventData.category || 'อีเวนต์'}
            </div>

            <h1 className="event-title">{eventData.title}</h1>

            {eventData.status && (
              <p>สถานะ: {EVENT_STATUS_LABELS[status] || 'ไม่ระบุสถานะ'}</p>
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
                disabled={!canRegister && !guestRetry}
                style={{
                  opacity: canRegister || guestRetry ? 1 : 0.55,
                  cursor: canRegister || guestRetry ? 'pointer' : 'not-allowed',
                }}
              >
                {guestRetry ? 'ตรวจสอบรายการเดิม →' : alreadyRegistered
                  ? 'ลงทะเบียนแล้ว'
                  : eventUnavailable
                    ? EVENT_STATUS_LABELS[status] || 'ปิดรับลงทะเบียน'
                    : !tickets.length
                      ? 'ไม่มีประเภทบัตร'
                      : !canChooseTicket
                        ? 'ไม่มีบัตรที่เปิดขาย'
                        : 'ลงทะเบียน →'}
              </button>
              {!isLoggedIn && registrationResult && !activeModal && <button type="button" onClick={() => setActiveModal('success')}>ดูใบลงทะเบียน</button>}
              {!activeModal && registerError && <p role="alert">{registerError}</p>}
              {!activeModal && inventoryError && (
                <p role="alert">
                  {inventoryError}{' '}
                  <button type="button" onClick={refreshInventory}>ลองอีกครั้ง</button>
                </p>
              )}
              {!isLoggedIn && canRegister && (
                <p className="ticket-reg">ลงทะเบียนโดยไม่ต้องมีบัญชี หรือเข้าสู่ระบบเพื่อเก็บรายการไว้ในบัญชี</p>
              )}
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
              {!isLoggedIn && <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                <label htmlFor="guest-name">ชื่อผู้เข้าร่วม</label>
                <input id="guest-name" maxLength={120} value={guestName} disabled={submitting || guestRetry} onChange={(e) => setGuestName(e.target.value)} />
                <label htmlFor="guest-email">อีเมล</label>
                <input id="guest-email" type="email" maxLength={254} value={guestEmail} disabled={submitting || guestRetry} onChange={(e) => setGuestEmail(e.target.value)} />
                <small>ใช้อีเมลเดียวกันกับบัญชีสมาชิกเพื่อรับรายการในภายหลัง</small>
              </div>}
              <label className="section-label">เลือกประเภทบัตร</label>

              <div className="ticket-options">
                {tickets.map((ticket) => {
                  const isSelected =
                    String(selectedTicket?.id) === String(ticket.id);

                  const remaining = Number(ticket.remaining ?? 0);
                  const available = canBuyTicket(ticket);

                  return (
                    <button
                      type="button"
                      key={ticket.id}
                      className={`modal-ticket-card ${
                        isSelected ? 'active' : ''
                      }`}
                      disabled={!available || submitting || guestRetry}
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setQty(1);
                        setRegisterError('');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: available ? 'pointer' : 'not-allowed',
                        opacity: available ? 1 : 0.55,
                      }}
                    >
                      <div>
                        <div className="t-name">{ticket.name}</div>
                        <div className="t-desc">
                          {ticket.description || ''}
                        </div>
                        <div className="t-desc">
                          {ticket.salesEnabled === false ? 'ปิดขายชั่วคราว' : remaining > 0 ? `เหลือ ${remaining} ใบ` : 'บัตรหมด'}
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
                    disabled={qty <= 1 || submitting || guestRetry}
                  >
                    −
                  </button>

                  <input type="text" value={qty} readOnly />

                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={qty >= maxQty || submitting || guestRetry}
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

              {inventoryError && <p role="alert">{inventoryError}</p>}
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
                  (!selectedTicket && !guestRetry) ||
                  (!guestRetry && (!canBuyTicket(selectedTicket) ||
                  alreadyRegistered ||
                  qty > maxQty ||
                  eventUnavailable))
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
                disabled={submitting || (!checkPaymentFirst && !paymentQr)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  color: '#fff',
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity:
                    submitting || (!checkPaymentFirst && !paymentQr)
                      ? 0.6
                      : 1,
                }}
              >
                {submitting ? 'กำลังตรวจสอบ...' : checkPaymentFirst ? 'ตรวจสอบสถานะ' : 'ยืนยันการชำระเงิน (Demo)'}
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={submitting || paymentNeedsReview}
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

            <h2 className="modal-title">{registrationResult?.status === 'CANCELLED' ? 'ยกเลิกการลงทะเบียนแล้ว' : 'ลงทะเบียนสำเร็จ!'}</h2>

            <p style={{ marginTop: '8px', color: '#666' }}>
              ระบบบันทึกการลงทะเบียนของคุณเรียบร้อยแล้ว
            </p>

            {receiptQr && <img src={receiptQr} alt="QR Code สำหรับบัตร" width={200} height={200} />}
            {!isLoggedIn && registrationResult?.status !== 'CANCELLED' && <>
              <p>กลับมาดู QR และรหัสบัตรได้จากเมนู “บัตรที่จองไว้” ในเบราว์เซอร์นี้</p>
              <button type="button" onClick={() => navigate('/guest-tickets')}>ไปที่บัตรที่จองไว้</button>
              <button type="button" disabled={submitting} onClick={() => withBookingLock(async () => {
                try { setRegistrationResult(await guestService.cancelBooking(registrationResult.registrationId)); await refreshInventory(); }
                catch (error) { setRegisterError(getErrorMessage(error)); try { setRegistrationResult(await guestService.receipt(registrationResult.registrationId)); } catch {} }
              })}>ยกเลิกการลงทะเบียน</button>
              <p>อยากเปิดบัตรจากเครื่องอื่น ให้ใช้บัญชีที่สมัครด้วยอีเมลเดียวกับตอนจอง</p>
              <button type="button" onClick={() => openModal('login', { pathname: '/MyRegistrationsPage', search: '?from=guest' })}>เข้าสู่ระบบเพื่อรับรายการ</button>
              <button type="button" onClick={() => openModal('register', { pathname: '/MyRegistrationsPage', search: '?from=guest' })}>สมัครด้วยอีเมลที่ใช้จอง</button>
            </>}
            {registerError && <p role="alert">{registerError}</p>}
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
                if (isLoggedIn) setRegistrationResult(null);
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
