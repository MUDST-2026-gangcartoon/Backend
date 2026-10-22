// ข้อมูลจำลองสำหรับพัฒนาหน้าบ้านเท่านั้น (ใช้เมื่อเปิดด้วย ?mock=1 ในโหมด dev)
// ครอบคลุมกรณีที่ต้องทดสอบ: กลุ่มหลายคน, ยกเลิก, เช็กอินทุกที่มา และข้อมูลเก่าที่ไม่มีที่มา

const iso = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();

export const MOCK_BOOKINGS = [
  { id: 'm1', name: 'สมชาย ใจดี', email: 'somchai@example.com', quantity: 1, ticketCode: 'GTH-A1B2C3D4E5', ticketTypeName: 'General Admission', registeredAt: iso(72), checkedInAt: iso(2), checkInSource: 'STAFF', checkedInBy: 'สตาฟ ก.' },
  { id: 'm2', name: 'มานี มีสุข', email: 'manee@example.com', quantity: 1, ticketCode: 'GTH-F6G7H8I9J0', ticketTypeName: 'VIP', registeredAt: iso(70), checkedInAt: iso(1.5), checkInSource: 'ONLINE' },
  { id: 'm3', name: 'ครอบครัวสุขใจ', email: 'sukjai@example.com', quantity: 4, ticketCode: 'GTH-K1L2M3N4O5', ticketCodes: ['GTH-K1L2M3N4O5', 'GTH-P6Q7R8S9T0', 'GTH-U1V2W3X4Y5', 'GTH-Z6A7B8C9D0'], ticketTypeName: 'General Admission', registeredAt: iso(48) },
  { id: 'm4', name: 'วิชัย ทดสอบ', email: 'wichai@example.com', quantity: 3, ticketCode: 'GTH-E1F2G3H4I5', ticketCodes: ['GTH-E1F2G3H4I5', 'GTH-J6K7L8M9N0', 'GTH-O1P2Q3R4S5'], ticketTypeName: 'VIP', registeredAt: iso(40), checkedInAt: iso(3), checkInSource: 'STAFF', checkedInBy: 'สตาฟ ข.' },
  { id: 'm5', name: 'นภา ยกเลิก', email: 'napa@example.com', quantity: 2, ticketCode: 'GTH-T1U2V3W4X5', ticketTypeName: 'General Admission', registeredAt: iso(60), status: 'CANCELLED', cancelledAt: iso(30) },
  // ข้อมูลเก่า: เช็กอินแล้วแต่ไม่มีที่มาและไม่มีผู้เช็กอิน
  { id: 'm6', name: 'สุดา ข้อมูลเก่า', email: 'suda@example.com', quantity: 1, ticketCode: 'GTH-Y1Z2A3B4C5', registeredAt: iso(90), checkedInAt: iso(5) },
  { id: 'm7', name: 'ประเสริฐ มาสาย', email: 'prasert@example.com', quantity: 1, ticketCode: 'GTH-D1E2F3G4H5', ticketTypeName: 'General Admission', registeredAt: iso(20) },
];

export const MOCK_CAPACITY = 30;

export function isMockMode() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('mock') === '1';
}
