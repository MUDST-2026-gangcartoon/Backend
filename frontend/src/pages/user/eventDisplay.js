export const EVENT_TIME_ZONE = 'Asia/Bangkok';

export const EVENT_CATEGORY_LABELS = {
  TECH: 'เทคโนโลยี',
  DESIGN: 'ออกแบบ',
  CAREER: 'อาชีพ',
  COMMUNITY: 'คอมมูนิตี้',
};

export const EVENT_STATUS_LABELS = {
  OPEN: 'เปิดรับลงทะเบียน',
  CLOSED: 'ปิดรับลงทะเบียน',
  FULL: 'เต็มแล้ว',
  ONGOING: 'กำลังจัดกิจกรรม',
  ENDED: 'สิ้นสุดแล้ว',
  REGISTERED: 'ลงทะเบียนแล้ว',
};

// API LocalDateTime values are Bangkok wall times; offset-bearing timestamps
// already identify an instant and are rendered in Bangkok for consistency.
export function parseEventDateTime(value) {
  if (typeof value !== 'string' || !value) return new Date(NaN);
  const localTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  return new Date(localTime.test(value) ? value + '+07:00' : value);
}
