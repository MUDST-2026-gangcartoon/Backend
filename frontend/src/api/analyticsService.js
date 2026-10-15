import apiClient from './apiClient.js';

export const analyticsService = {
  recordSiteVisit: () =>
    apiClient.post('/analytics/visit', {
      type: 'SITE',
    }),

  recordEventVisit: (eventId) => {
    if (eventId == null || eventId === '') {
      return Promise.resolve(null);
    }

    return apiClient.post('/analytics/visit', {
      type: 'EVENT',
      eventId: Number(eventId),
    });
  },
};
