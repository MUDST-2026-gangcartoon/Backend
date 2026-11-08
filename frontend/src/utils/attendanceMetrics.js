export function reportCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function getAttendanceMetrics(report) {
  const totalOrders = reportCount(report.orders);
  const cancelledOrders = reportCount(report.cancelledOrders);
  const activeOrders = reportCount(report.activeOrders) ?? (
    totalOrders !== null && cancelledOrders !== null && cancelledOrders <= totalOrders
      ? totalOrders - cancelledOrders
      : null
  );

  const activeSeats = reportCount(report.participants);
  const checkedInSeats = reportCount(report.checkedIn);
  const countsValid = activeSeats !== null && checkedInSeats !== null && checkedInSeats <= activeSeats;
  const notCheckedInSeats = countsValid ? activeSeats - checkedInSeats : null;
  const percent = new Intl.NumberFormat('th-TH', { style: 'percent', maximumFractionDigits: 1 });
  const showRate = countsValid && activeSeats > 0 ? percent.format(checkedInSeats / activeSeats) : null;
  const noShowRate = countsValid && activeSeats > 0 ? percent.format(notCheckedInSeats / activeSeats) : null;

  return { activeOrders, activeSeats, checkedInSeats, notCheckedInSeats, showRate, noShowRate };
}
