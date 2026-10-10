
import apiClient from './apiClient';

export const eventService = {
  getAllEvents: () => apiClient.get('/events'),

  getEventById: (eventId) =>
    apiClient.get(`/events/${encodeURIComponent(eventId)}`),

  createEvent: (eventData) =>
    apiClient.post('/events', eventData),

  getAdminStats: () =>
    apiClient.get('/admin/stats'),
};
