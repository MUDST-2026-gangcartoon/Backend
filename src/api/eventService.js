import apiClient from './apiClient';

export const eventService = {
    // ดึงรายการอีเวนต์ทั้งหมด (ใช้ในหน้า UpcomingEventsPage / ManageEventsPage)
    getAllEvents: async () => {
        return await apiClient.get('/events');
    },
    // ดึงข้อมูลอีเวนต์ทั้งหมด
    getAllEvents: async () => {
        return await apiClient.get('/events');
  },
    // ดึงรายละเอียดอีเวนต์เดียว (ใช้ในหน้า EventDetailPage)
    getEventById: async (eventId) => {
        return await apiClient.get(`/events/${eventId}`);
    },
    // สร้างอีเวนต์ใหม่ (Admin)
    createEvent: async (eventData) => {
        return await apiClient.post('/events', eventData);
    },
    // เพิ่ม API สำหรับดึงสถิติหน้า Admin Dashboard
    getAdminStats: async () => {
        try {
            return await apiClient.get('/admin/stats');
        } catch (error) {
            console.warn("Admin stats endpoint not available, falling back to event calculation");
            return null;
        }
    }
};