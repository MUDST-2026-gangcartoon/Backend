import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { registrationService } from '../../api/registrationService';
import './MyRegistrationsPage.css';

const formatEventDate = (dateString) => {
  if (!dateString) return { month: '-', day: '-' };
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { month: '-', day: '-' };
  return {
    month: new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(date),
    day: new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(date),
  };
};

const formatEventTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุเวลา';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return `${new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)} น.`;
};

const getHttpStatus = (error) =>
  error?.status ?? error?.response?.status ?? error?.data?.status;

const isTicketCheckedIn = (item) => Boolean(
  item?.checkedIn === true || item?.isCheckedIn === true ||
  item?.checkedInAt || item?.checkInAt || item?.status === 'CHECKED_IN'
);

const getResponseItems = (response) => {
  const payload = response?.data ?? response;
  const items = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.registrations ?? [];
  return Array.isArray(items) ? items : [];
};

const getLoadErrorMessage = (error) => {
  const status = getHttpStatus(error);
  if (status === 401 || status === 403) {
    return 'กรุณาเข้าสู่ระบบเพื่อดูรายการลงทะเบียนของคุณ';
  }
  return 'ไม่สามารถโหลดรายการลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง';
};

const getCancelErrorMessage = (error) => {
  const status = getHttpStatus(error);
  const message = error?.data?.message ?? error?.data?.error ??
    error?.response?.data?.message ?? error?.response?.data?.error;
  if (status === 409) {
    return message || 'ไม่สามารถยกเลิกได้ เพราะคุณเช็กอินเข้าร่วมอีเวนต์นี้แล้ว';
  }
  if (status === 401 || status === 403) {
    return 'กรุณาเข้าสู่ระบบอีกครั้งก่อนยกเลิกการลงทะเบียน';
  }
  if (status === 404) return message || 'ไม่พบรายการลงทะเบียนนี้ อาจถูกยกเลิกไปแล้ว';
  return message || error?.message || 'ยกเลิกการลงทะเบียนไม่สำเร็จ กรุณาลองอีกครั้ง';
};

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await registrationService.getMyRegistrations();
      setRegistrations(getResponseItems(response));
    } catch (error) {
      setErrorMessage(getLoadErrorMessage(error));
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await registrationService.getMyRegistrations();
        if (isMounted) setRegistrations(getResponseItems(response));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getLoadErrorMessage(error));
          setRegistrations([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleCancelRegistration = async (item) => {
    const eventId = item?.event?.id;
    const registrationId = item?.id ?? item?.ticketCode;
    if (eventId == null || registrationId == null) {
      setCancelError('ไม่พบข้อมูลอีเวนต์หรือรายการลงทะเบียนที่ต้องการยกเลิก');
      setNoticeMessage('');
      return;
    }

    // ตรวจใน UI เพื่อช่วยผู้ใช้เท่านั้น; Backend ต้องตรวจซ้ำเสมอ
    const eventHasCheckedInRegistration = registrations.some((registration) =>
      String(registration?.event?.id) === String(eventId) && isTicketCheckedIn(registration)
    );
    if (eventHasCheckedInRegistration) {
      setCancelError('ไม่สามารถยกเลิกได้ เพราะมีรายการเช็กอินของอีเวนต์นี้แล้ว');
      setNoticeMessage('');
      return;
    }

    const confirmed = window.confirm(
      `คุณต้องการยกเลิกการลงทะเบียน "${item?.event?.title ?? 'อีเวนต์นี้'}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    setCancelError('');
    setNoticeMessage('');
    setCancellingId(String(registrationId));
    try {
      await registrationService.cancelRegistration(eventId);
      // Backend ลบด้วย userId + eventId จึงนำรายการทั้งหมดของอีเวนต์นี้ออก
      setRegistrations((current) => current.filter(
        (registration) => String(registration?.event?.id) !== String(eventId)
      ));
      setNoticeMessage('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
    } catch (error) {
      setCancelError(getCancelErrorMessage(error));
      // ถ้าข้อมูลเช็กอินเปลี่ยนระหว่างเปิดหน้า ให้ดึงสถานะล่าสุดจาก Backend
      if (getHttpStatus(error) === 409) await fetchRegistrations();
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="registrations-container">
        <header className="page-header">
          <h1>การลงทะเบียนของฉัน</h1>
          <p>รายการอีเวนต์ทั้งหมดที่คุณลงทะเบียนเข้าร่วมไว้</p>
        </header>

        {cancelError && (
          <div className="registration-alert registration-alert-error" role="alert">
            <span>{cancelError}</span>
            <button type="button" onClick={() => setCancelError('')} aria-label="ปิดข้อความแจ้งเตือน">ปิด</button>
          </div>
        )}
        {noticeMessage && (
          <div className="registration-alert registration-alert-success" role="status">
            <span>{noticeMessage}</span>
            <button type="button" onClick={() => setNoticeMessage('')} aria-label="ปิดข้อความแจ้งเตือน">ปิด</button>
          </div>
        )}

        <div className="registrations-list">
          {loading ? (
            <div className="empty-state" role="status">กำลังโหลดรายการลงทะเบียน...</div>
          ) : errorMessage ? (
            <div className="empty-state" role="alert">
              <p>{errorMessage}</p>
              <button type="button" className="btn-retry-registrations" onClick={fetchRegistrations}>ลองโหลดอีกครั้ง</button>
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">
              <p>ยังไม่มีรายการลงทะเบียนอีเวนต์ในขณะนี้</p>
              <Link to="/UpcomingEventsPage" className="empty-state-link">ค้นหาอีเวนต์ที่น่าสนใจ</Link>
            </div>
          ) : registrations.map((item) => {
            const event = item?.event ?? {};
            const eventDate = formatEventDate(event.startsAt);
            const ticketId = item?.ticketCode || item?.id;
            const registrationKey = String(item?.id ?? ticketId ?? `${event.id}-registration`);
            const actionId = String(item?.id ?? item?.ticketCode ?? '');
            const isCancelling = cancellingId === actionId;
            const checkedIn = isTicketCheckedIn(item);
            const eventHasCheckedInRegistration = registrations.some((registration) =>
              String(registration?.event?.id) === String(event.id) && isTicketCheckedIn(registration)
            );
            const cancelLocked = eventHasCheckedInRegistration || event.id == null;

            return (
              <article key={registrationKey} className="registration-card">
                <div className="reg-left-info">
                  <div className="reg-date-badge" aria-label={`วันที่ ${eventDate.day} ${eventDate.month}`}>
                    <span className="reg-month">{eventDate.month}</span>
                    <span className="reg-day">{eventDate.day}</span>
                  </div>
                  <div className="reg-details">
                    <h2 className="reg-title">{event.title || 'ไม่พบชื่ออีเวนต์'}</h2>
                    <div className="reg-meta">
                      <span>🕒 {formatEventTime(event.startsAt)}</span>
                      <span>📍 {event.location || 'ไม่ระบุสถานที่'}</span>
                      {item?.ticketTypeName && <span>🎟️ {item.ticketTypeName}</span>}
                      {Number(item?.quantity) > 0 && <span>จำนวน {item.quantity} ใบ</span>}
                    </div>
                    {item?.totalPrice != null && (
                      <div className="reg-total-price">
                        ยอดรวม {new Intl.NumberFormat('th-TH', {
                          style: 'currency', currency: 'THB', maximumFractionDigits: 2,
                        }).format(Number(item.totalPrice) || 0)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="reg-right-actions">
                  <span className={`status-pill ${checkedIn ? 'checked' : 'success'}`}>
                    {checkedIn ? 'เช็กอินแล้ว' : 'ลงทะเบียนสำเร็จ'}
                  </span>
                  {ticketId != null ? (
                    <Link to={`/MyTicketsPage?ticketId=${encodeURIComponent(String(ticketId))}`} className="btn-view-ticket">
                      ดูตั๋วของฉัน →
                    </Link>
                  ) : <span className="missing-ticket">ไม่มีรหัสตั๋ว</span>}
                  <div className="cancel-block">
                    <button
                      type="button"
                      className="btn-cancel-registration"
                      disabled={isCancelling || cancelLocked}
                      onClick={() => handleCancelRegistration(item)}
                    >
                      {cancelLocked ? 'ยกเลิกไม่ได้' : isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการลงทะเบียน'}
                    </button>
                    <span className="cancel-note">
                      {cancelLocked ? 'อีเวนต์นี้มีรายการเช็กอินแล้ว หรือข้อมูลอีเวนต์ไม่ครบ' : 'ยกเลิกได้จนกว่าจะเช็กอิน'}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}