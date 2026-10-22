// ส่งออก/คัดลอกรายชื่อผู้ลงทะเบียนของอีเวนต์ (ใช้ในหน้า Dashboard)

const CHECKIN_KEYS = ['checkedIn', 'isCheckedIn', 'checkedInAt', 'checkInAt'];

function isCheckedIn(item) {
  return Boolean(
    item?.checkedIn === true ||
      item?.isCheckedIn === true ||
      item?.checkedInAt ||
      item?.checkInAt ||
      item?.status === 'CHECKED_IN',
  );
}

function formatDateTime(value) {
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

// กันสูตรใน Excel/Sheets (ค่าที่ขึ้นต้นด้วย = + - @) และครอบด้วย "" พร้อมescape
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function getUniqueEmails(attendees) {
  const seen = new Set();

  attendees.forEach((item) => {
    const email = String(item?.email ?? '').trim().toLowerCase();
    if (email) seen.add(email);
  });

  return [...seen];
}

export function attendeesToCsv(attendees) {
  const hasCheckinData = attendees.some((item) =>
    CHECKIN_KEYS.some((key) => key in (item || {})),
  );

  const header = [
    'ลำดับ',
    'ชื่อ',
    'อีเมล',
    'จำนวนที่นั่ง',
    'รหัสตั๋ว',
    'วันเวลาที่ลงทะเบียน',
    ...(hasCheckinData ? ['สถานะเช็กอิน', 'เวลาเช็กอิน'] : []),
  ];

  const lines = attendees.map((item, index) => {
    const quantity = Number(item?.quantity) > 1 ? Number(item.quantity) : 1;
    const checkedIn = isCheckedIn(item);

    return [
      index + 1,
      item?.name || item?.attendeeName || '',
      item?.email || '',
      quantity,
      item?.ticketCode || '',
      formatDateTime(item?.registeredAt ?? item?.createdAt),
      ...(hasCheckinData
        ? [
            checkedIn ? 'เช็กอินแล้ว' : 'ยังไม่เช็กอิน',
            formatDateTime(item?.checkedInAt ?? item?.checkInAt),
          ]
        : []),
    ];
  });

  // \uFEFF (BOM) ทำให้ Excel อ่านภาษาไทยได้ถูกต้อง
  return `\uFEFF${[header, ...lines]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}`;
}

export function safeFileName(text) {
  const cleaned = String(text || 'event')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .slice(0, 60);
  return cleaned || 'event';
}

export function downloadTextFile(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // เบราว์เซอร์/โหมดที่ไม่มี Clipboard API (เช่น http ที่ไม่ใช่ localhost)
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();

  const ok = document.execCommand('copy');
  area.remove();

  if (!ok) throw new Error('copy failed');
}
