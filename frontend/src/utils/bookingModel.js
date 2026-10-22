// โมเดลกลางของ "รายการจอง" ใช้ร่วมกันทั้ง Drawer ผู้เข้าร่วม, Dashboard และหน้าเช็กอินของสตาฟ
// รองรับข้อมูลเก่าที่ยังไม่มี ที่มาของการเช็กอิน / สถานะยกเลิก / จำนวนคนต่อรายการ

export const STATUS_FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'ยังไม่มา' },
  { key: 'checkedin', label: 'เช็กอินแล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

export const SOURCE_FILTERS = [
  { key: 'all', label: 'ทุกที่มา' },
  { key: 'staff', label: 'เจ้าหน้าที่' },
  { key: 'online', label: 'ออนไลน์ผ่านเว็บ' },
  { key: 'unknown', label: 'ไม่ทราบที่มา' },
];

export const SOURCE_LABEL = {
  staff: 'เจ้าหน้าที่',
  online: 'ออนไลน์ผ่านเว็บ',
  unknown: 'ไม่ทราบที่มา',
};

export const STATUS_LABEL = {
  pending: 'ยังไม่มา',
  checkedin: 'เช็กอินแล้ว',
  cancelled: 'ยกเลิก',
};

const toText = (value) => (value == null ? '' : String(value).trim());

function pickSource(raw) {
  const value = toText(
    raw?.checkInSource ??
      raw?.checkedInSource ??
      raw?.checkInChannel ??
      raw?.checkinChannel ??
      raw?.checkInMethod ??
      raw?.source,
  ).toUpperCase();

  if (['STAFF', 'ONSITE', 'ON_SITE', 'MANUAL', 'SCAN', 'QR'].includes(value)) {
    return 'staff';
  }
  if (['ONLINE', 'WEB', 'WEBSITE', 'SELF'].includes(value)) return 'online';
  return 'unknown';
}

function isCancelled(raw) {
  const status = toText(raw?.status ?? raw?.registrationStatus).toUpperCase();
  return Boolean(
    raw?.cancelled === true ||
      raw?.isCancelled === true ||
      raw?.cancelledAt ||
      status === 'CANCELLED' ||
      status === 'CANCELED',
  );
}

function isCheckedIn(raw) {
  return Boolean(
    raw?.checkedIn === true ||
      raw?.isCheckedIn === true ||
      raw?.checkedInAt ||
      raw?.checkInAt ||
      toText(raw?.status).toUpperCase() === 'CHECKED_IN',
  );
}

export function normalizeBooking(raw, index = 0) {
  const people = Math.max(1, Number(raw?.quantity ?? raw?.people ?? raw?.seats) || 1);
  const cancelled = isCancelled(raw);
  const checkedIn = !cancelled && isCheckedIn(raw);

  const codes = Array.isArray(raw?.ticketCodes)
    ? raw.ticketCodes.map(toText).filter(Boolean)
    : [];
  const mainCode = toText(raw?.ticketCode ?? raw?.code);
  if (mainCode && !codes.includes(mainCode)) codes.unshift(mainCode);

  const status = cancelled ? 'cancelled' : checkedIn ? 'checkedin' : 'pending';

  return {
    key: raw?.id ?? raw?.registrationId ?? raw?.bookingId ?? `${raw?.email || 'row'}-${index}`,
    name: toText(raw?.name ?? raw?.attendeeName) || 'ไม่ระบุชื่อ',
    email: toText(raw?.email),
    people,
    isGroup: people > 1,
    codes,
    ticketType: toText(raw?.ticketTypeName ?? raw?.ticketType),
    status,
    source: checkedIn ? pickSource(raw) : null,
    registeredAt: raw?.registeredAt ?? raw?.createdAt ?? raw?.registeredOn ?? null,
    checkedInAt: checkedIn ? raw?.checkedInAt ?? raw?.checkInAt ?? null : null,
    checkedInBy: checkedIn ? toText(raw?.checkedInBy ?? raw?.checkInBy ?? raw?.staffName) : '',
    cancelledAt: cancelled ? raw?.cancelledAt ?? null : null,
  };
}

export function normalizeBookings(list) {
  return (Array.isArray(list) ? list : []).map(normalizeBooking);
}

// จำนวน "รายการ" (bookings) กับ "คน" (people) นับแยกกัน และไม่นับรายการที่ยกเลิกเป็นที่นั่งที่ถูกใช้
export function summarizeBookings(rows, capacity = null) {
  const sum = (items) => items.reduce((total, row) => total + row.people, 0);
  const active = rows.filter((row) => row.status !== 'cancelled');
  const checkedIn = rows.filter((row) => row.status === 'checkedin');
  const pending = rows.filter((row) => row.status === 'pending');
  const cancelled = rows.filter((row) => row.status === 'cancelled');

  const capacityNumber =
    capacity !== null && capacity !== undefined && capacity !== ''
      ? Number(capacity)
      : null;
  const activePeople = sum(active);

  const bySource = { staff: 0, online: 0, unknown: 0 };
  checkedIn.forEach((row) => {
    bySource[row.source || 'unknown'] += row.people;
  });

  return {
    bookings: active.length,
    people: activePeople,
    checkedInBookings: checkedIn.length,
    checkedInPeople: sum(checkedIn),
    pendingBookings: pending.length,
    pendingPeople: sum(pending),
    cancelledBookings: cancelled.length,
    cancelledPeople: sum(cancelled),
    seatsLeft:
      capacityNumber !== null && Number.isFinite(capacityNumber)
        ? Math.max(capacityNumber - activePeople, 0)
        : null,
    bySource,
  };
}

export function filterBookings(rows, { q = '', status = 'all', source = 'all' } = {}) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);

  return rows.filter((row) => {
    if (status !== 'all' && row.status !== status) return false;
    if (source !== 'all') {
      // ที่มาของการเช็กอินใช้ได้เฉพาะรายการที่เช็กอินแล้ว
      if (row.status !== 'checkedin' || row.source !== source) return false;
    }
    if (tokens.length === 0) return true;

    const haystack = [row.name, row.email, row.ticketType, ...row.codes]
      .join(' ')
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
}

// กันสูตรใน Excel/Sheets และ escape เครื่องหมายคำพูด
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// CSV ตามตัวกรองที่ผู้ใช้เลือกอยู่ (ส่งแถวที่กรองแล้วเข้ามา)
export function bookingsToCsv(rows) {
  const header = [
    'ลำดับ',
    'ชื่อ',
    'อีเมล',
    'จำนวนคน',
    'รหัสบัตร',
    'ประเภทบัตร',
    'สถานะ',
    'ที่มาของการเช็กอิน',
    'เวลาเช็กอิน',
    'ผู้เช็กอิน',
    'วันเวลาที่จอง',
  ];

  const lines = rows.map((row, index) => [
    index + 1,
    row.name,
    row.email,
    row.people,
    row.codes.join(' '),
    row.ticketType,
    STATUS_LABEL[row.status],
    row.status === 'checkedin' ? SOURCE_LABEL[row.source || 'unknown'] : '',
    formatDateTime(row.checkedInAt),
    row.checkedInBy,
    formatDateTime(row.registeredAt),
  ]);

  // BOM ทำให้ Excel อ่านภาษาไทยได้ถูกต้อง
  return `\uFEFF${[header, ...lines].map((r) => r.map(csvCell).join(',')).join('\r\n')}`;
}
