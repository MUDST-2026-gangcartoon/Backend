
import apiClient from './apiClient';

export const registrationService = {
  // ดึงรายการลงทะเบียนของผู้ใช้ปัจจุบัน
  getMyRegistrations: () => apiClient.get('/registrations/me'),

  // ลงทะเบียนอีเวนต์
  registerForEvent: (eventId, payload) =>
    apiClient.post(
      `/events/${encodeURIComponent(eventId)}/registrations`,
      payload
    ),

  // ยกเลิกการลงทะเบียนอีเวนต์
  cancelRegistration: (eventId) =>
    apiClient.delete(
      `/events/${encodeURIComponent(eventId)}/registrations`
    ),
};
