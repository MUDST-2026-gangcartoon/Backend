// ส่งออก/คัดลอกรายชื่อผู้ลงทะเบียนของอีเวนต์ (ใช้ในหน้า Dashboard)

// กันสูตรใน Excel/Sheets (ค่าที่ขึ้นต้นด้วย = + - @) และครอบด้วย "" พร้อมescape
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^(?:\s*[=+\-@]|[\t\r\n])/.test(text)) text = `'${text}`;
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
