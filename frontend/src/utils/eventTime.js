// เวลากิจกรรมจาก API เป็น LocalDateTime ของ Asia/Bangkok (ไม่มี timezone offset)
// ต้องตีความเป็น +07:00 เสมอ ไม่ใช่ timezone ของเครื่องผู้ใช้

const BANGKOK_OFFSET = '+07:00';
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

// คืนเวลาเป็น epoch ms หรือ null ถ้า parse ไม่ได้
export function parseEventTime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  if (!text) return null;

  // รองรับ "2026-11-02 18:00:00" และ LocalDateTime ที่ไม่มี offset
  text = text.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += 'T00:00:00';
  if (!HAS_ZONE.test(text)) text += BANGKOK_OFFSET;

  const time = new Date(text).getTime();
  return Number.isNaN(time) ? null : time;
}

const BANGKOK_TZ = 'Asia/Bangkok';

export function formatEventTime(value, options) {
  const time = parseEventTime(value);
  if (time === null) return '';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(new Date(time));
}

export function formatEventTimeShort(value) {
  return formatEventTime(value, {
    dateStyle: undefined,
    timeStyle: undefined,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
