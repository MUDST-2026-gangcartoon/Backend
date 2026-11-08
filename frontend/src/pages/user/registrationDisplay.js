export const isCancelledRegistration = (item) =>
  item?.status === 'CANCELLED' || Boolean(item?.cancelledAt);

export function getRegistrationItems(response) {
  const payload = response?.data ?? response;
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.registrations;
  return Array.isArray(items) ? items : [];
}
