import { test, expect } from '@playwright/test';
import {
  E2E, requireIsolatedEnvironment, responseJson, screenshot,
  login, signup, newRolePage, createEventViaAdmin, ensureE2eBackend,
  openBooking, checkout, confirm, getRegistrations, checkInThroughUI, csrfPost,
} from './support.mjs';

test.beforeEach(async ({ page }) => {
  requireIsolatedEnvironment();
  await ensureE2eBackend(page.request);
});

test('E2E-AUTO-002 / E2E-001: Free ticket via UI → My Tickets → STAFF check-in', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { free: true });
  await signup(page);
  const booking = await openBooking(page, event);
  await expect(booking.locator('.total-section')).toContainText('0');

  const createdPromise = page.waitForResponse(res =>
    new URL(res.url()).pathname === '/api/events/' + event.eventId + '/registrations' &&
    res.request().method() === 'POST'
  );
  await booking.getByRole('button', { name: 'ยืนยันลงทะเบียน' }).click();
  const reg = await responseJson(await createdPromise, 200);
  expect(reg.ticketCode).toMatch(/^GTH-[A-Z0-9]+$/);
  expect(Number(reg.totalPrice)).toBe(0);
  await expect(page.getByRole('heading', { name: 'ลงทะเบียนสำเร็จ!' })).toBeVisible();
  await page.goto('/MyTicketsPage');
  const ticket = page.locator('.myticket-card').filter({ hasText: reg.ticketCode });
  await expect(ticket).toBeVisible();
  await expect(ticket.getByAltText('QR Code ของบัตร')).toBeVisible();
  await screenshot(page, info, 'free-ticket-qr');

  const staff = await newRolePage(browser, E2E.staffEmail);
  try {
    const checked = await checkInThroughUI(staff.page, event.eventId, reg.ticketCode);
    expect(checked.checkedIn).toBe(true);
    expect(checked.checkedInAt).toBeTruthy();
    await screenshot(staff.page, info, 'free-ticket-checkin');
  } finally { await staff.context.close(); }
});

test('E2E-002: Paid Checkout stays pending and produces no ticket', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  expect(pending.ticketCode).toBeFalsy();
  expect(await getRegistrations(page)).toEqual([]);
  const status = await responseJson(await page.request.get('/api/payments/mock/' + pending.paymentId), 200);
  expect(status.status).toBe('PENDING_PAYMENT');
  await screenshot(page, info, 'pending-payment-ui');
  await page.goto('/MyTicketsPage');
  await expect(page.getByText('คุณยังไม่มีตั๋วในขณะนี้')).toBeVisible();
  await screenshot(page, info, 'no-ticket-before-confirm');
});

test('E2E-003: Paid Payment Confirm issues one registration and ticket', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  expect(await getRegistrations(page)).toHaveLength(0);
  const paid = await confirm(page, pending);
  expect(Number(paid.registration.totalPrice)).toBe(100);
  const status = await responseJson(await page.request.get('/api/payments/mock/' + pending.paymentId), 200);
  expect(status.status).toBe('CONFIRMED');
  await screenshot(page, info, 'confirmed-payment-ui');
  await page.goto('/MyTicketsPage');
  const ticket = page.locator('.myticket-card').filter({ hasText: paid.registration.ticketCode });
  await expect(ticket).toBeVisible();
  await expect(ticket.getByAltText('QR Code ของบัตร')).toBeVisible();
  const regs = await getRegistrations(page);
  expect(regs).toHaveLength(1);
  expect(regs[0].id).toBe(paid.registration.id);
});

test('E2E-004: Staff check-in uses the ticket created in this flow', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const paid = await confirm(page, await checkout(page, event));
  const staff = await newRolePage(browser, E2E.staffEmail);
  try {
    const checked = await checkInThroughUI(staff.page, event.eventId, paid.registration.ticketCode);
    expect(checked.checkedIn).toBe(true);
    expect(checked.ticketCode).toBe(paid.registration.ticketCode);
    expect(checked.checkedInAt).toBeTruthy();
    const attendees = await responseJson(
      await staff.page.request.get('/api/staff/events/' + event.eventId + '/attendees'), 200
    );
    const entry = attendees.filter(a => a.ticketCode === paid.registration.ticketCode);
    expect(entry).toHaveLength(1);
    expect(entry[0].checkedInAt).toBe(checked.checkedInAt);
    await screenshot(staff.page, info, 'staff-checkin-success');
  } finally { await staff.context.close(); }
});

test('E2E-AUTO-004 / E2E-005: Cancel registration invalidates ticket but retains payment history', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  const confirmed = await confirm(page, pending);
  const code = confirmed.registration.ticketCode;
  await page.goto('/MyRegistrationsPage');
  const card = page.locator('.registration-card').filter({ hasText: event.eventTitle });
  await expect(card).toBeVisible();
  const cancelledPromise = page.waitForResponse(res =>
    new URL(res.url()).pathname === '/api/events/' + event.eventId + '/registrations' &&
    res.request().method() === 'DELETE'
  );
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'ยกเลิกการลงทะเบียน' }).click();
  await responseJson(await cancelledPromise, 204);
  await expect(card).toHaveCount(0);
  expect(await getRegistrations(page)).toEqual([]);
  await page.goto('/MyTicketsPage');
  await expect(page.getByText('คุณยังไม่มีตั๋วในขณะนี้')).toBeVisible();
  const history = await responseJson(await page.request.get('/api/payments/mock/' + pending.paymentId), 200);
  expect(history.status).toBe('CONFIRMED');
  await screenshot(page, info, 'ticket-gone-payment-history-remains');

  const staff = await newRolePage(browser, E2E.staffEmail);
  try {
    await checkInThroughUI(staff.page, event.eventId, code, 404);
    await expect(staff.page.getByRole('alert').first()).toBeVisible();
    await screenshot(staff.page, info, 'cancelled-ticket-checkin-rejected');
  } finally { await staff.context.close(); }
});

test('E2E-AUTO-003 / E2E-006: Guest/ADMIN/STAFF/Non-owner forbidden, Owner allowed', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  const endpoint = '/api/payments/mock/' + pending.paymentId;
  const ownerStatus = await responseJson(await page.request.get(endpoint), 200);
  expect(ownerStatus.paymentId).toBe(pending.paymentId);

  const anonymousContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const response = await anonymousContext.request.get(endpoint);
    expect(response.status()).toBe(401);
  } finally { await anonymousContext.close(); }

  for (const email of [E2E.adminEmail, E2E.staffEmail]) {
    const role = await newRolePage(browser, email);
    try {
      const response = await role.page.request.get(endpoint);
      expect(response.status(), 'Role ' + email).toBe(403);
    } finally { await role.context.close(); }
  }

  const other = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const otherPage = await other.newPage();
    await signup(otherPage);
    const response = await otherPage.request.get(endpoint);
    expect(response.status()).toBe(404);
    await screenshot(otherPage, info, 'non-owner-rejected');
  } finally { await other.close(); }
  await screenshot(page, info, 'payment-owner-allowed');
});

test('E2E-007 @slow: Pending payment expires and cannot be confirmed', async ({ page, browser }, info) => {
  // Real backend clock, no time mocking. This scenario needs >10 minutes.
  test.setTimeout(12 * 60 * 1000);
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  await screenshot(page, info, 'pending-before-expiration');

  // Poll the REAL backend until its actual TTL expires. No arbitrary sleep.
  await expect.poll(async () => {
    const response = await page.request.get('/api/payments/mock/' + pending.paymentId);
    const status = await responseJson(response, 200);
    return status.status;
  }, {
    timeout: 11 * 60 * 1000,
    intervals: [1000, 5000, 10000, 15000],
    message: 'Payment must eventually become EXPIRED using the backend clock',
  }).toBe('EXPIRED');

  await expect(page.getByRole('button', { name: 'ยืนยันการชำระเงิน (Demo)' })).toBeDisabled();
  const attempted = await csrfPost(page, '/api/payments/mock/' + pending.paymentId + '/confirm');
  expect(attempted.status()).toBe(409);
  expect(await getRegistrations(page)).toEqual([]);
  await page.goto('/MyTicketsPage');
  await expect(page.getByText('คุณยังไม่มีตั๋วในขณะนี้')).toBeVisible();
  await screenshot(page, info, 'expired-confirm-409-no-ticket');
});

test('E2E-008: Repeating Confirm returns original ticket, no duplicate', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  await signup(page);
  const pending = await checkout(page, event);
  const first = await confirm(page, pending);
  const secondResponse = await csrfPost(page, '/api/payments/mock/' + pending.paymentId + '/confirm');
  const second = await responseJson(secondResponse, 200);
  expect(second.paymentStatus).toBe('CONFIRMED');
  expect(second.registration.id).toBe(first.registration.id);
  expect(second.registration.ticketCode).toBe(first.registration.ticketCode);
  const regs = await getRegistrations(page);
  expect(regs).toHaveLength(1);
  expect(regs[0].ticketCode).toBe(first.registration.ticketCode);
  await page.goto('/MyTicketsPage');
  await expect(page.locator('.myticket-card')).toHaveCount(1);
  await screenshot(page, info, 'confirmed-idempotence-no-duplicate');
});

test('E2E-AUTO-005: ADMIN creates event via UI, USER can find/open it', async ({ page, browser }, info) => {
  const event = await createEventViaAdmin(browser, { free: true });
  await signup(page);
  await page.goto('/UpcomingEventsPage?search=' + encodeURIComponent(event.eventTitle));
  await expect(page.getByRole('heading', { name: event.eventTitle, exact: true }).first()).toBeVisible();
  await page.goto('/event-detail/' + event.eventId);
  await expect(page.getByRole('heading', { name: event.eventTitle, exact: true })).toBeVisible();
  const detail = await responseJson(await page.request.get('/api/events/' + event.eventId), 200);
  expect(detail.title).toBe(event.eventTitle);
  expect(Number(detail.spotsLeft)).toBe(5);
  await screenshot(page, info, 'admin-created-event-visible-to-user');
});
