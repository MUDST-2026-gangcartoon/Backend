import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { registrationService } from '../../api/registrationService';
import './MyRegistrationsPage.css';
import { EVENT_TIME_ZONE, parseEventDateTime } from './eventDisplay';
import { getRegistrationItems, isCancelledRegistration } from './registrationDisplay';

const formatEventDate = (dateString) => {
  if (!dateString) return { month: '-', day: '-' };
  const date = parseEventDateTime(dateString);
  if (Number.isNaN(date.getTime())) return { month: '-', day: '-' };
  return {
    month: new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: EVENT_TIME_ZONE }).format(date),
    day: new Intl.DateTimeFormat('th-TH', { day: 'numeric', timeZone: EVENT_TIME_ZONE }).format(date),
  };
};

const formatEventTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุเวลา';
  const date = parseEventDateTime(dateString);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return `${new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: EVENT_TIME_ZONE,
  }).format(date)} น.`;
};

const getHttpStatus = (error) =>
  error?.status ?? error?.response?.status ?? error?.data?.status;

const isTicketCheckedIn = (item) => Boolean(
  item?.checkedIn === true || item?.isCheckedIn === true ||
  item?.checkedInAt || item?.checkInAt || item?.status === 'CHECKED_IN'
);

const getCancellationBlock = (item, registrations) => {
  if (isCancelledRegistration(item)) return item.cancelReason || 'ยกเลิกรายการแล้ว';
  if (item?.event?.id == null || item.id == null) return 'ข้อมูลรายการลงทะเบียนไม่ครบ';
  if (item.cancellable === false || isTicketCheckedIn(item)) {
    return item.cancellationBlockedReason || 'รายการนี้ไม่สามารถยกเลิกได้';
  }
  const activeForEvent = registrations.filter((entry) =>
    !isCancelledRegistration(entry) && String(entry.event?.id) === String(item.event.id)
  );
  return activeForEvent.length > 1 ? 'มีหลายรายการสำหรับกิจกรรมนี้ กรุณาติดต่อผู้จัดเพื่อยกเลิกรายการที่ถูกต้อง' : '';
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
      setRegistrations(getRegistrationItems(response));
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
        if (isMounted) setRegistrations(getRegistrationItems(response));
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
    const block = getCancellationBlock(item, registrations);
    if (cancellingId != null) return;
    if (block) {
      setCancelError(block);
      setNoticeMessage('');
      return;
    }

    const eventId = item.event.id;
    const registrationId = item.id;
    const confirmed = window.confirm(
      `คุณต้องการยกเลิกการลงทะเบียน "${item?.event?.title ?? 'อีเวนต์นี้'}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    setCancelError('');
    setNoticeMessage('');
    setCancellingId(String(registrationId));
    try {
      await registrationService.cancelRegistration(eventId);
      await fetchRegistrations();
      setNoticeMessage('ยกเลิกการลงทะเบียนเรียบร้อยแล้ว');
    } catch (error) {
      setCancelError(getCancelErrorMessage(error));
      // If the server may have accepted the request, refresh before the user can retry.
      const status = getHttpStatus(error);
      if (!status || status === 408 || status === 404 || status === 409 || status >= 500) {
        await fetchRegistrations();
      }
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
            const registrationId = item?.id ?? item?.registrationId;
            const registrationKey = String(registrationId ?? item?.ticketCode ?? event.id);
            const isCancelling = cancellingId === String(registrationId);
            const cancelled = isCancelledRegistration(item);
            const checkedIn = !cancelled && isTicketCheckedIn(item);
            const cancellationBlock = getCancellationBlock(item, registrations);

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
                  <span className={'status-pill ' + (cancelled ? 'cancelled' : checkedIn ? 'checked' : 'success')}>
                    {cancelled ? 'ยกเลิกแล้ว' : checkedIn ? 'เช็กอินแล้ว' : 'ลงทะเบียนสำเร็จ'}
                  </span>
                  {registrationId != null && (
                    <Link to={'/MyTicketsPage?registrationId=' + encodeURIComponent(String(registrationId))} className="btn-view-ticket">
                      ดูรายละเอียดบัตร →
                    </Link>
                  )}
                  <div className="cancel-block">
                    <button
                      type="button"
                      className="btn-cancel-registration"
                      disabled={cancellingId != null || Boolean(cancellationBlock)}
                      onClick={() => handleCancelRegistration(item)}
                    >
                      {cancellationBlock ? 'ยกเลิกไม่ได้' : isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการลงทะเบียน'}
                    </button>
                    <span className="cancel-note">
                      {cancellationBlock || 'ยกเลิกได้ตามเงื่อนไขของกิจกรรม'}
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