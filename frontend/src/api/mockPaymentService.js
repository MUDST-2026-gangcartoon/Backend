
import apiClient from './apiClient';

export const mockPaymentService = {
  checkout: ({ eventId, ticketTypeId, quantity }) =>
    apiClient.post('/payments/mock/checkout', {
      eventId,
      ticketTypeId,
      quantity,
    }),

  confirm: (paymentId) =>
    apiClient.post(
      `/payments/mock/${encodeURIComponent(paymentId)}/confirm`
    ),

  getStatus: (paymentId) =>
    apiClient.get(
      `/payments/mock/${encodeURIComponent(paymentId)}`
    ),

  cancel: (paymentId) =>
    apiClient.post(
      `/payments/mock/${encodeURIComponent(paymentId)}/cancel`
    ),
};

export default mockPaymentService;
