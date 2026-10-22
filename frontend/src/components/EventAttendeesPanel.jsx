import React, { useMemo, useState } from 'react';

const CHECKIN_KEYS = ['checkedIn', 'isCheckedIn', 'checkedInAt', 'checkInAt'];

// API บางตัวอาจไม่ส่งข้อมูลเช็กอินมา จึงเช็กก่อนว่ามีฟิลด์เหล่านี้หรือไม่
function hasCheckinField(item) {
  return CHECKIN_KEYS.some((key) => key in (item || {}));
}

function isCheckedIn(item) {
  return Boolean(
    item?.checkedIn === true ||
      item?.isCheckedIn === true ||
      item?.checkedInAt ||
      item?.checkInAt ||
      item?.status === 'CHECKED_IN',
  );
}

function getRegisteredAt(item) {
  return item?.registeredAt ?? item?.createdAt ?? item?.registeredOn ?? null;
}

function formatDateTime(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { day, time: `${time} น.` };
}

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'in', label: 'เช็กอินแล้ว' },
  { key: 'out', label: 'ยังไม่เช็กอิน' },
];

// รายละเอียดผู้ลงทะเบียนของอีเวนต์เดียว ใช้ในหน้า Dashboard
export default function EventAttendeesPanel({
  capacity = null,
  registered = null,
  attendees = [],
  loading = false,
  error = '',
  initialSearch = '',
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState(initialSearch);

  const rows = useMemo(
    () =>
      attendees
        .map((item, index) => ({
          key: item.id ?? item.registrationId ?? `${item.email}-${index}`,
          name: item.name || item.attendeeName || 'ไม่ระบุชื่อ',
          email: item.email || '',
          quantity: Number(item.quantity) > 1 ? Number(item.quantity) : 1,
          registeredAt: getRegisteredAt(item),
          checkedIn: isCheckedIn(item),
          checkedInAt: item.checkedInAt ?? item.checkInAt ?? null,
        }))
        // ลงทะเบียนล่าสุดขึ้นก่อน
        .sort(
          (a, b) =>
            new Date(b.registeredAt || 0).getTime() -
            new Date(a.registeredAt || 0).getTime(),
        ),
    [attendees],
  );

  const showCheckin = attendees.some(hasCheckinField);
  const checkedInCount = rows.filter((row) => row.checkedIn).length;
  const notCheckedInCount = rows.length - checkedInCount;

  const registeredCount =
    registered !== null && registered !== undefined
      ? Number(registered)
      : rows.length;
  const capacityNumber =
    capacity !== null && capacity !== undefined ? Number(capacity) : null;
  const seatsLeft =
    capacityNumber !== null
      ? Math.max(capacityNumber - registeredCount, 0)
      : null;

  const counts = { all: rows.length, in: checkedInCount, out: notCheckedInCount };

  const visibleRows = rows.filter((row) => {
    if (showCheckin && filter === 'in' && !row.checkedIn) return false;
    if (showCheckin && filter === 'out' && row.checkedIn) return false;

    const text = query.trim().toLowerCase();
    if (!text) return true;

    return (
      row.name.toLowerCase().includes(text) ||
      row.email.toLowerCase().includes(text)
    );
  });

  return (
    <div className="event-attendees">
      <div className="att-summary">
            <div className="att-tile">
              <span>ที่นั่งทั้งหมด</span>
              <strong>{capacityNumber ?? '-'}</strong>
            </div>
            <div className="att-tile accent">
              <span>ลงทะเบียนแล้ว</span>
              <strong>{registeredCount}</strong>
            </div>
            <div className="att-tile">
              <span>ที่นั่งว่าง</span>
              <strong>{seatsLeft ?? '-'}</strong>
            </div>
          </div>
      
          {showCheckin && !loading && !error && (
            <div className="att-checkin">
              <div className="att-checkin-text">
                <span>
                  เช็กอินแล้ว <b>{checkedInCount}</b> คน
                </span>
                <span>
                  ยังไม่เช็กอิน <b>{notCheckedInCount}</b> คน
                </span>
              </div>
              <div
                className="att-checkin-bar"
                role="progressbar"
                aria-label="ความคืบหน้าการเช็กอิน"
                aria-valuemin={0}
                aria-valuemax={rows.length}
                aria-valuenow={checkedInCount}
              >
                <div
                  style={{
                    width: `${
                      rows.length > 0
                        ? (checkedInCount / rows.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
      
          {loading ? (
            <p className="att-empty">กำลังโหลดรายชื่อผู้ลงทะเบียน...</p>
          ) : error ? (
            <p role="alert" className="att-empty att-error">
              โหลดรายชื่อไม่สำเร็จ: {error}
            </p>
          ) : (
            <>
              {showCheckin && (
                <div className="att-filters" role="tablist">
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={filter === item.key}
                      className={`att-filter${
                        filter === item.key ? ' is-active' : ''
                      }`}
                      onClick={() => setFilter(item.key)}
                    >
                      {item.label} ({counts[item.key]})
                    </button>
                  ))}
                </div>
              )}
      
              <input
                type="search"
                className="att-search"
                placeholder="ค้นหาชื่อหรืออีเมล"
                aria-label="ค้นหาผู้ลงทะเบียน"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
      
              <ul className="att-list">
                {visibleRows.map((row) => {
                  const registeredTime = formatDateTime(row.registeredAt);
                  const checkinTime = formatDateTime(row.checkedInAt);
      
                  return (
                    <li key={row.key} className="att-item">
                      <div className="avatar">{row.name.charAt(0)}</div>
      
                      <div className="att-info">
                        <div className="att-name">
                          {row.name}
                          {row.quantity > 1 && (
                            <span className="att-qty">
                              {row.quantity} ที่นั่ง
                            </span>
                          )}
                        </div>
                        {row.email && (
                          <div className="att-email">{row.email}</div>
                        )}
                        <div className="att-time">
                          <span>ลงทะเบียน</span>{' '}
                          {registeredTime ? (
                            <>
                              <span className="att-nowrap">
                                {registeredTime.day}
                              </span>{' '}
                              <span className="att-nowrap">
                                {registeredTime.time}
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
      
                      {showCheckin && (
                        <span
                          className={`att-chip ${row.checkedIn ? 'in' : 'out'}`}
                        >
                          {row.checkedIn
                            ? `เช็กอิน${checkinTime ? ' ' + checkinTime.time : ''}`
                            : 'ยังไม่เช็กอิน'}
                        </span>
                      )}
                    </li>
                  );
                })}
      
                {visibleRows.length === 0 && (
                  <li className="att-empty">
                    {rows.length === 0
                      ? 'ยังไม่มีผู้ลงทะเบียน'
                      : 'ไม่พบรายชื่อที่ตรงกับเงื่อนไข'}
                  </li>
                )}
              </ul>
            </>
          )}
    </div>
  );
}
