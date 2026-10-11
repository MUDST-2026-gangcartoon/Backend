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

  getEventById: (eventId) =>
    apiClient.get(`/events/${encodeURIComponent(eventId)}`),

  createEvent: (eventData) =>
    apiClient.post('/admin/events', eventData),

  uploadEventImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm('/admin/uploads', formData);
  },
  updateEvent: (eventId, eventData) =>
    apiClient.put(`/admin/events/${encodeURIComponent(eventId)}`, eventData),

  deleteEvent: (eventId) =>
    apiClient.delete(`/admin/events/${encodeURIComponent(eventId)}`),

  getEventAttendees: (eventId) =>
    apiClient.get(`/admin/events/${encodeURIComponent(eventId)}/attendees`),

  getAdminStats: () =>
    apiClient.get('/admin/analytics/summary'),
};