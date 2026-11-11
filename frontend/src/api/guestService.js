import apiClient from './apiClient';

const id = (value) => encodeURIComponent(value);
export const guestService = {
  startAttempt: (eventId, attemptId) => apiClient.post('/analytics/registration-attempts', { eventId: Number(eventId), attemptId }),
  register: (eventId, payload, key) => apiClient.post(`/guest/events/${id(eventId)}/registrations`, payload, { 'Idempotency-Key': key }),
  checkout: (eventId, payload, key) => apiClient.post(`/guest/events/${id(eventId)}/checkout`, payload, { 'Idempotency-Key': key }),
  bookings: () => apiClient.get('/guest/bookings'),
  receipt: (registrationId) => apiClient.get(`/guest/bookings/${id(registrationId)}`),
  cancelBooking: (registrationId) => apiClient.post(`/guest/bookings/${id(registrationId)}/cancel`),
  payment: (paymentId) => apiClient.get(`/guest/payments/${id(paymentId)}`),
  confirmPayment: (paymentId) => apiClient.post(`/guest/payments/${id(paymentId)}/confirm`),
  cancelPayment: (paymentId) => apiClient.post(`/guest/payments/${id(paymentId)}/cancel`),
  requestVerification: () => apiClient.post('/auth/email-verification/request'),
  confirmVerification: (code) => apiClient.post('/auth/email-verification/confirm', { code }),
  claim: () => apiClient.post('/registrations/claim-guest'),
};
