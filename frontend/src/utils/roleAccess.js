// กำหนดพื้นที่ใช้งานของแต่ละบทบาท: แต่ละบทบาทเข้าได้เฉพาะพื้นที่ของตัวเองเท่านั้น
export const ROLE_HOME = {
  admin: '/admin/dashboard',
  staff: '/staff/checkin',
  user: '/',
};

export function normalizeRole(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'staff', 'user'].includes(role) ? role : '';
}

// หน้าแรกของบทบาทนั้น ๆ (ผู้ที่ยังไม่ล็อกอินใช้หน้าของผู้ใช้ทั่วไป)
export function homeForRole(role) {
  return ROLE_HOME[role] || ROLE_HOME.user;
}
