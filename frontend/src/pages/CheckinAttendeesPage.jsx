
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StaffNavbar from '../components/StaffNavbar.jsx';
import { eventService } from '../api/eventService.js';
import { staffService } from '../api/staffService.js';
import '../staff-shell.css';
import '../checkin-attendees.css';

function unwrapResponse(response) {
  let value = response;

  for (let i = 0; i < 3; i += 1) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      break;
    }

    if (value.data !== undefined) {
      value = value.data;
      continue;
    }

    if (value.result !== undefined) {
      value = value.result;
      continue;
    }

    break;
  }

  return value;
}

function extractItems(response, keys = []) {
  const value = unwrapResponse(response);

  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }

  for (const key of ['items', 'content', 'data', 'result']) {
    if (value[key] !== undefined) {
      const items = extractItems(value[key], keys);
      if (items.length > 0) return items;
    }
  }

  return [];
}

function formatTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTicketCode(item) {
  return (
    item?.ticketCode ??
    item?.code ??
    item?.registrationCode ??
    item?.ticket?.ticketCode ??
    'ไม่พบรหัสตั๋ว'
  );
}

function isCheckedIn(item) {
  return Boolean(
    item?.checkedIn === true ||
    item?.isCheckedIn === true ||
    item?.checkedInAt ||
    item?.checkInAt ||
    item?.status === 'CHECKED_IN'
  );
}

export default function CheckinAttendeesPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [recent, setRecent] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const scannerRef = useRef(null);
  const scannerStartingRef = useRef(false);
  const scannerHandledRef = useRef(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const [
        eventResponse,
        attendeeResponse,
        recentResponse,
      ] = await Promise.all([
        eventService.getEventById(eventId),
        staffService.getAttendees(eventId),
        staffService.getRecentCheckIns(eventId),
      ]);

      const eventData = unwrapResponse(eventResponse);

      setEvent(
        eventData && !Array.isArray(eventData)
          ? eventData
          : null
      );

      setAttendees(
        extractItems(attendeeResponse, [
          'attendees',
          'registrations',
          'items',
          'content',
        ])
      );

      setRecent(
        extractItems(recentResponse, [
          'recentCheckIns',
          'checkIns',
          'checkins',
          'items',
          'content',
        ])
      );
    } catch (err) {
      setError(
        err.message ||
          'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเข้าสู่ระบบและสิทธิ์ Staff'
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        console.error('Unable to stop QR scanner:', err);
      }

      try {
        scanner.clear();
      } catch (err) {
        console.error('Unable to clear QR scanner:', err);
      }

      scannerRef.current = null;
    }

    scannerStartingRef.current = false;
    setScannerActive(false);
  }, []);

  const handleCheckin = useCallback(async (scannedCode) => {
    const ticketCode = (
      typeof scannedCode === 'string' ? scannedCode : code
    ).trim().toUpperCase();

    if (!ticketCode) {
      setError('กรุณากรอกรหัสตั๋ว');
      setMessage('');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await staffService.checkIn(
        eventId,
        ticketCode
      );

      const result = unwrapResponse(response);

      if (!result || result.checkedIn !== true) {
        throw new Error(
          result?.message || 'ไม่สามารถเช็กอินตั๋วนี้ได้'
        );
      }

      setMessage(
        `ตั๋วนี้เช็กอินแล้ว: ${
          result.attendeeName || 'ผู้เข้าร่วม'
        }`
      );

      setCode('');
      await loadData(false);
    } catch (err) {
      setError(
        err.message ||
          'เช็กอินไม่สำเร็จ กรุณาตรวจสอบรหัสตั๋ว'
      );
    } finally {
      setSubmitting(false);
    }
  }, [code, eventId, loadData]);

  const startScanner = useCallback(async () => {
    if (scannerStartingRef.current || scannerRef.current) return;

    scannerStartingRef.current = true;
    scannerHandledRef.current = false;

    setScannerError('');
    setError('');
    setMessage('');

    // Show the camera container before initializing the scanner.
    setScannerActive(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Wait for React to render the visible camera container.
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const reader = document.getElementById('staff-qr-reader');

      if (!reader) {
        throw new Error('ไม่พบพื้นที่แสดงกล้อง');
      }

      const scanner = new Html5Qrcode('staff-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 4 / 3,
          // กรอบสแกนปรับตามขนาดภาพกล้อง (70% ของด้านที่สั้นกว่า)
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.7);
            return { width: size, height: size };
          },
        },
        async (decodedText) => {
          if (scannerHandledRef.current) return;

          const ticketCode = decodedText.trim();
          if (!ticketCode) return;

          scannerHandledRef.current = true;
          setCode(ticketCode);

          await stopScanner();
          await handleCheckin(ticketCode);
        },
        () => {
          // Ignore frames without a readable QR code.
        }
      );
    } catch (err) {
      const scanner = scannerRef.current;

      if (scanner) {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          scanner.clear();
        } catch (stopError) {
          console.error('Unable to clean up QR scanner:', stopError);
        }
      }

      scannerRef.current = null;
      setScannerActive(false);
      setScannerError(
        'เปิดกล้องไม่ได้ กรุณาอนุญาตการใช้กล้องและเข้าเว็บผ่าน HTTPS หรือ localhost'
      );

      console.error('Unable to start QR scanner:', err);
    } finally {
      scannerStartingRef.current = false;
    }
  }, [stopScanner, handleCheckin]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().catch((err) => {
            console.error('Unable to stop QR scanner:', err);
          });
        }
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !submitting) {
      event.preventDefault();
      handleCheckin();
    }
  };

  const totalGuests = attendees.reduce(
    (total, attendee) =>
      total + (Number(attendee.quantity) || 1),
    0
  );

  const checkedIn = attendees.reduce(
    (total, attendee) =>
      total +
      (isCheckedIn(attendee)
        ? Number(attendee.quantity) || 1
        : 0),
    0
  );

  const remaining = Math.max(0, totalGuests - checkedIn);

  if (loading) {
    return (
      <>
        <StaffNavbar />
        <main className="page">
          <p>กำลังโหลดข้อมูล...</p>
        </main>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <StaffNavbar />
        <main className="page" style={{ paddingTop: 48 }}>
          <section style={{ textAlign: 'center', padding: 40 }}>
            <h1>ไม่สามารถโหลดอีเวนต์ได้</h1>

            <p className="subtitle">
              {error || `ไม่พบอีเวนต์รหัส ${eventId}`}
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/staff/checkin')}
            >
              กลับไปรายการอีเวนต์
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <StaffNavbar />

      <main className="page">
        <div className="crumbs">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/staff/checkin');
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            เปลี่ยนอีเวนต์
          </a>

          <span className="sep">/</span>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ทีมหน้างาน
          </a>

          <span className="sep">/</span>
          <span className="current">เช็กอินผู้เข้าร่วม</span>
        </div>

        <div className="page-head">
          <div>
            <h1>เช็กอินผู้เข้าร่วม</h1>

            <p className="subtitle">
              {event.title || event.name || 'กิจกรรม'} ·{' '}
              <b>{totalGuests}</b> ผู้ลงทะเบียน
            </p>
          </div>

          <span className="badge-live">
            <span className="dot" />
            กำลังเช็กอินสด
          </span>
        </div>

        <hr className="rule" />

        {error && (
          <p className="helper-text err" role="alert">
            {error}
          </p>
        )}

        <section className={`checkin-card${scannerActive ? ' scanning' : ''}`}>
          <div className="cc-form">
            <span className="eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              </svg>
              กรอกรหัสด้วยตนเอง
            </span>

            <div>
              <label className="field-label" htmlFor="ticketCode">
                รหัสตั๋ว
              </label>

              <input
                className={`ticket-input${error ? ' err' : ''}`}
                id="ticketCode"
                type="text"
                placeholder="GTH-XXXXXXXXXX"
                autoComplete="off"
                spellCheck="false"
                value={code}
                disabled={submitting}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                  setMessage('');
                }}
                onKeyDown={handleKeyDown}
              />

              <p
                className={`helper-text${error ? ' err' : ''}`}
                role={error ? 'alert' : 'status'}
              >
                {error || message || 'กรอกรหัสตั๋ว แล้วกดเช็กอิน'}
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleCheckin()}
              disabled={submitting}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {submitting ? 'กำลังเช็กอิน...' : 'เช็กอินตั๋ว'}
            </button>

            <div className="divider-or">หรือสแกน QR ทางขวา</div>
          </div>

          <div className="cc-scan">
            <svg className="paw-deco one" viewBox="0 0 100 100" fill="#fff">
              <circle cx="30" cy="20" r="10" />
              <circle cx="60" cy="20" r="10" />
              <ellipse cx="45" cy="55" rx="28" ry="26" />
            </svg>

            <svg className="paw-deco two" viewBox="0 0 100 100" fill="#fff">
              <circle cx="30" cy="20" r="10" />
              <circle cx="60" cy="20" r="10" />
              <ellipse cx="45" cy="55" rx="28" ry="26" />
            </svg>

            {!scannerActive && (
              <div className="scan-frame">
                <span className="scan-corner tl" />
                <span className="scan-corner tr" />
                <span className="scan-corner bl" />
                <span className="scan-corner br" />
                <span className="scan-line" />

                <svg
                  className="scan-icon"
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#FFF3D1" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#FFF3D1" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#FFF3D1" strokeWidth="2" />
                  <path
                    d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"
                    fill="#FFF3D1"
                  />
                </svg>
              </div>
            )}

            <div
              id="staff-qr-reader"
              className="qr-reader"
              style={{ display: scannerActive ? 'block' : 'none' }}
            />

            {!scannerActive ? (
              <button
                type="button"
                className="btn-primary"
                onClick={startScanner}
                disabled={submitting}
              >
                เปิดกล้องสแกน QR
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => void stopScanner()}
              >
                หยุดสแกน
              </button>
            )}

            {scannerError && (
              <p className="helper-text err" role="alert">
                {scannerError}
              </p>
            )}

            <p className="cc-scan-caption">
              {scannerActive
                ? 'วาง QR Code ให้อยู่ในกรอบกล้อง'
                : 'กดเปิดกล้องเพื่อสแกน QR Code'}
            </p>
          </div>
        </section>

        <section className="stats-row">
          <div className="stat-card">
            <div className="stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v4l3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              </svg>
              เช็กอินล่าสุด
            </div>

            <div className="stat-main">คนที่เพิ่งมาถึง</div>

            <div className="stat-sub">
              {recent.length === 0
                ? 'ยังไม่มีการเช็กอิน'
                : `เช็กอินล่าสุดเมื่อ ${formatTime(
                    recent[0].checkedInAt ??
                      recent[0].checkInAt ??
                      recent[0].createdAt
                  )}`}
            </div>

            <div className="recent-list">
              {recent.map((item, index) => (
                <div
                  className="recent-item"
                  key={`${getTicketCode(item)}-${index}`}
                >
                  <span className="ri-dot" />
                  <span className="ri-code">{getTicketCode(item)}</span>
                  <span className="ri-time">
                    {formatTime(
                      item.checkedInAt ??
                        item.checkInAt ??
                        item.createdAt
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              ผู้ลงทะเบียนทั้งหมด
            </div>

            <div className="stat-number">{totalGuests} ราย</div>

            <div className="stat-sub" style={{ marginTop: 8 }}>
              เช็กอินแล้ว {checkedIn} ราย · เหลืออีก {remaining} ราย
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
