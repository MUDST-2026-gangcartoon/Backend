import apiClient from './apiClient';

export const staffService = {
  getAttendees: (eventId) =>
    apiClient.get(
      `/staff/events/${encodeURIComponent(eventId)}/attendees`
    ),

  checkIn: (eventId, ticketCode) =>
    apiClient.post(
      `/staff/events/${encodeURIComponent(eventId)}/check-in`,
      { ticketCode: ticketCode.trim() }
    ),

  getRecentCheckIns: (eventId) =>
    apiClient.get(
      `/staff/events/${encodeURIComponent(eventId)}/recent-check-ins`
    ),
};
