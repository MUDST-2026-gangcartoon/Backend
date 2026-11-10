
import apiClient from './apiClient';

export const mockPaymentService = {
  checkout: ({ eventId, ticketTypeId, quantity, attemptId }) =>
    apiClient.post('/payments/mock/checkout', {
      eventId,
      ticketTypeId,
      quantity,
      attemptId,
    }),

  confirm: (paymentId) =>
    apiClient.post(
      `/payments/mock/${encodeURIComponent(paymentId)}/confirm`
    ),

  getStatus: (paymentId) =>
    apiClient.get(
      `/payments/mock/${encodeURIComponent(paymentId)}`
    ),

  getHistory: (page = 0, status = 'ALL') =>
    apiClient.get('/payments/mock/history?' + new URLSearchParams({ page, status })),

  resume: (paymentId) =>
    apiClient.get('/payments/mock/' + encodeURIComponent(paymentId) + '/resume'),

  cancel: (paymentId) =>
    apiClient.post(
      `/payments/mock/${encodeURIComponent(paymentId)}/cancel`
    ),
};

export default mockPaymentService;
