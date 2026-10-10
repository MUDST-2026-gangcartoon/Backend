import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { registrationService } from '../../api/registrationService';
import './MyRegistrationsPage.css';

const formatEventDate = (dateString) => {
  if (!dateString) {
    return { month: '-', day: '-' };
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return { month: '-', day: '-' };
  }

  return {
    month: new Intl.DateTimeFormat('th-TH', {
      month: 'short',
    }).format(date),
    day: new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
    }).format(date),
  };
};

const formatEventTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุเวลา';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'ไม่ระบุเวลา';
  }

  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' น.';
};

const getErrorMessage = (error) => {
  const status = error?.status ?? error?.response?.status;

  if (status === 401 || status === 403) {
    return 'กรุณาเข้าสู่ระบบเพื่อดูรายการลงทะเบียนของคุณ';
  }

  return 'ไม่สามารถโหลดรายการลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง';
};

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchRegistrations = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await registrationService.getMyRegistrations();

        // รองรับทั้ง API ที่คืน array โดยตรง
        // และ API ที่ห่อรายการไว้ใน items หรือ registrations
        const items = Array.isArray(response)
          ? response
          : response?.items ?? response?.registrations ?? [];

        if (isMounted) {
          setRegistrations(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setRegistrations([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRegistrations();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="registrations-container">
        <div className="page-header">
          <h1>การลงทะเบียนของฉัน</h1>
          <p>รายการอีเวนต์ทั้งหมดที่คุณลงทะเบียนเข้าร่วมไว้</p>
        </div>

        <div className="registrations-list">
          {loading ? (
            <div className="empty-state">
              กำลังโหลดรายการลงทะเบียน...
            </div>
          ) : errorMessage ? (
            <div className="empty-state" role="alert">
              {errorMessage}
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state">
              ยังไม่มีรายการลงทะเบียนอีเวนต์ในขณะนี้
              <div style={{ marginTop: '12px' }}>
                <Link to="/upcoming-events">
                  ค้นหาอีเวนต์ที่น่าสนใจ
                </Link>
              </div>
            </div>
          ) : (
            registrations.map((item) => {
              const event = item.event ?? {};
              const eventDate = formatEventDate(event.startsAt);
              const ticketId = item.ticketCode || item.id;
              const registrationKey = item.id ?? ticketId;

              return (
                <div
                  key={registrationKey}
                  className="registration-card"
                >
                  <div className="reg-left-info">
                    <div className="reg-date-badge">
                      <span className="reg-month">
                        {eventDate.month}
                      </span>
                      <span className="reg-day">
                        {eventDate.day}
                      </span>
                    </div>

                    <div className="reg-details">
                      <div className="reg-title">
                        {event.title || 'ไม่พบชื่ออีเวนต์'}
                      </div>

                      <div className="reg-meta">
                        <span>
                          🕒 {formatEventTime(event.startsAt)}
                        </span>

                        <span>
                          📍 {event.location || 'ไม่ระบุสถานที่'}
                        </span>

                        {item.ticketTypeName && (
                          <span>
                            🎟️ {item.ticketTypeName}
                          </span>
                        )}

                        {Number(item.quantity) > 0 && (
                          <span>
                            จำนวน {item.quantity} ใบ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="reg-right-actions">
                    <span className="status-pill success">
                      ลงทะเบียนสำเร็จ
                    </span>

                    {ticketId != null ? (
                      <Link
                        to={`/MyTicketsPage?ticketId=${encodeURIComponent(
                          String(ticketId)
                        )}`}
                        className="btn-view-ticket"
                      >
                        ดูตั๋วของฉัน →
                      </Link>
                    ) : (
                      <span>
                        ไม่มีรหัสตั๋ว
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}