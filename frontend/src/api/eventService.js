import apiClient from './apiClient';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const eventService = {
  // ดึงกิจกรรมตามหน้า
  getAllEvents: (params = {}) => {
    const query = buildQueryString({
      page: params.page ?? 0,
      size: params.size ?? 20,
      search: params.search,
      category: params.category,
      status: params.status,
    });

    return apiClient.get(`/events${query}`);
  },

  // ดึงกิจกรรมทุกหน้า เช่น ใช้ในหน้า Staff Check-in
  
getAllEventsAcrossPages: async (params = {}) => {
  const size = Math.min(Math.max(params.size ?? 20, 1), 20);
  let page = params.page ?? 0;
  const allEvents = [];

  while (true) {
    const response = await eventService.getAllEvents({
      ...params,
      page,
      size,
    });

    // Backend ส่ง EventPageDto: { items, totalPages, hasNext, ... }
    const items = Array.isArray(response)
      ? response
      : Array.isArray(response?.items)
        ? response.items
        : [];

    allEvents.push(...items);

    if (Array.isArray(response)) break;

    if (typeof response?.hasNext === 'boolean') {
      if (!response.hasNext) break;
    } else if (Number.isFinite(response?.totalPages)) {
      if (page + 1 >= response.totalPages) break;
    } else if (items.length < size) {
      break;
    }

    // ป้องกันวนต่อโดยไม่มีข้อมูล
    if (items.length === 0) break;

    page += 1;
  }

  return allEvents;
},


  // ดึงรายละเอียดกิจกรรม
  getEventById: (eventId) =>
    apiClient.get(`/events/${encodeURIComponent(eventId)}`),

  // สร้างกิจกรรม
  createEvent: (eventData) =>
    apiClient.post('/admin/events', eventData),

  // อัปโหลดรูปกิจกรรม
  uploadEventImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm('/admin/uploads', formData);
  },

  // แก้ไขกิจกรรม
  updateEvent: (eventId, eventData) =>
    apiClient.put(
      `/admin/events/${encodeURIComponent(eventId)}`,
      eventData
    ),

  // ลบกิจกรรม
  deleteEvent: (eventId) =>
    apiClient.delete(`/admin/events/${encodeURIComponent(eventId)}`),

  // ดึงรายชื่อผู้ลงทะเบียนกิจกรรม
  getEventAttendees: (eventId) =>
    apiClient.get(
      `/admin/events/${encodeURIComponent(eventId)}/attendees`
    ),

  // ดึงสถิติ Admin
  getAdminStats: () =>
    apiClient.get('/admin/analytics/summary'),
};