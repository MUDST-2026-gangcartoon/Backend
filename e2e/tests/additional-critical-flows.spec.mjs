import { test, expect } from '@playwright/test';
import {
  ACCOUNTS, requireE2EPassword, verifyE2ESeed, expectJsonResponse, login,
  logoutUser, screenshot, currentRegistrations, seedEventViaAdmin, uniqueEventTitle,
  checkoutPaid, confirmPaid, registerFree, staffCheckin,
} from '../support/flows.mjs';

// Each scenario provisions its own unique event. One test's payment, ticket or
// registration is never used as input to another test.
// An isolated E2E backend with the original fixtures is required before the suite.
test.beforeEach(async ({ page }) => {
  requireE2EPassword();
  await verifyE2ESeed(page);
});

test('E2E-AUTO-002: Free Ticket → My Tickets → STAFF Check-in', async ({ page, browser }, info) => {
  const password = requireE2EPassword();
  const title = uniqueEventTitle('FREE');
  const event = await seedEventViaAdmin(browser, password, title, 0);

  await login(page, ACCOUNTS.user, password);
  const oldRegs = await currentRegistrations(page);
  expect(oldRegs.filter(r => r.event?.id === event.id)).toHaveLength(0);

  const registration = await registerFree(page, event.id);
  expect(registration.event.id).toBe(event.id);
  const newRegs = (await currentRegistrations(page)).filter(r => r.event?.id === event.id);
  expect(newRegs).toHaveLength(1);
  expect(newRegs[0].ticketCode).toBe(registration.ticketCode);
  await screenshot(page, info, 'free-registration-success');

  await page.goto('/MyTicketsPage');
  const ticketCard = page.locator('.myticket-card').filter({ hasText: registration.ticketCode });
  await expect(ticketCard).toBeVisible();
  await expect(ticketCard.getByAltText('QR Code ของบัตร')).toBeVisible();
  await screenshot(page, info, 'free-ticket-qr');

  const staffContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const staff = await staffContext.newPage();
    await login(staff, ACCOUNTS.staff, password);
    const result = await staffCheckin(staff, event.id, registration.ticketCode);
    expect(result.checkedIn).toBe(true);
    expect(result.checkedInAt).toBeTruthy();
    await screenshot(staff, info, 'free-ticket-staff-checkin');
  } finally {
    await staffContext.close();
  }
});

test('E2E-AUTO-003: Guest/ADMIN/STAFF/Non-owner/Owner Payment Authorization', async ({ page, browser }, info) => {
  const password = requireE2EPassword();
  const event = await seedEventViaAdmin(browser, password, uniqueEventTitle('SECURITY'), 100);
  await login(page, ACCOUNTS.user, password);
  const payment = await checkoutPaid(page, event.id);
  const url = '/api/payments/mock/' + payment.paymentId;
  await screenshot(page, info, 'owner-pending-payment');

  // Owner: 200. The owner browser context keeps its session throughout this test.
  const owner = await expectJsonResponse(await page.request.get(url), 200);
  expect(owner.paymentId).toBe(payment.paymentId);

  const guestCtx = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const guestResponse = await guestCtx.request.get(url);
    expect(guestResponse.status()).toBe(401);
  } finally { await guestCtx.close(); }

  for (const [email, expected] of [
    [ACCOUNTS.admin, 403],
    [ACCOUNTS.staff, 403],
    [ACCOUNTS.other, 404],
  ]) {
    const ctx = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
    try {
      const p = await ctx.newPage();
      await login(p, email, password);
      const response = await p.request.get(url);
      expect(response.status(), email + ' must receive ' + expected).toBe(expected);
    } finally { await ctx.close(); }
  }

  const after = await expectJsonResponse(await page.request.get(url), 200);
  expect(after.paymentId).toBe(payment.paymentId);
  expect(after.status).toBe('PENDING_PAYMENT');
  await screenshot(page, info, 'authorization-owner-still-accessible');
});

test('E2E-AUTO-004: USER Cancel → old Ticket rejected → Payment History retained', async ({ page, browser }, info) => {
  const password = requireE2EPassword();
  const title = uniqueEventTitle('CANCEL');
  const event = await seedEventViaAdmin(browser, password, title, 100);
  await login(page, ACCOUNTS.user, password);
  const payment = await checkoutPaid(page, event.id);
  const confirmed = await confirmPaid(page, payment.paymentId);
  const code = confirmed.registration.ticketCode;
  await screenshot(page, info, 'ticket-before-cancellation');

  await page.goto('/MyRegistrationsPage');
  const row = page.locator('.registration-card').filter({ hasText: title });
  await expect(row).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  const cancelPromise = page.waitForResponse(r => r.request().method() === 'DELETE' &&
    new URL(r.url()).pathname === '/api/events/' + event.id + '/registrations');
  await row.getByRole('button', { name: 'ยกเลิกการลงทะเบียน' }).click();
  const cancelled = await cancelPromise;
  expect(cancelled.status()).toBe(204);
  await expect(row).toHaveCount(0);
  expect((await currentRegistrations(page)).filter(r => r.event?.id === event.id)).toHaveLength(0);
  await screenshot(page, info, 'registration-cancelled');

  await page.goto('/MyTicketsPage');
  await expect(page.locator('.myticket-card').filter({ hasText: code })).toHaveCount(0);
  const history = await expectJsonResponse(
    await page.request.get('/api/payments/mock/' + payment.paymentId), 200,
  );
  expect(history.status).toBe('CONFIRMED');
  await screenshot(page, info, 'payment-history-retained');

  const staffContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const staff = await staffContext.newPage();
    await login(staff, ACCOUNTS.staff, password);
    await staffCheckin(staff, event.id, code, 404);
    await expect(staff.getByRole('alert').first()).toBeVisible();
    await screenshot(staff, info, 'cancelled-ticket-rejected');
  } finally { await staffContext.close(); }
});

test('E2E-AUTO-005: ADMIN creates Event via UI → USER can view new Event', async ({ page, browser }, info) => {
  const password = requireE2EPassword();
  const title = uniqueEventTitle('ADMIN');
  await login(page, ACCOUNTS.admin, password);
  await page.goto('/manage-events');
  await expect(page.getByRole('heading', { name: 'จัดการอีเวนต์' })).toBeVisible();
  await page.getByRole('button', { name: 'สร้างอีเวนต์' }).first().click();

  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('heading', { name: 'สร้างอีเวนต์' })).toBeVisible();
  await drawer.getByLabel('ชื่ออีเวนต์').fill(title);
  await drawer.getByLabel('รายละเอียด', { exact: true }).fill('ทดสอบการสร้างกิจกรรมผ่านหน้า ADMIN ด้วย Playwright');
  await drawer.getByLabel('สถานที่').fill('ห้องทดสอบ QA');
  await drawer.getByLabel('วันและเวลา').fill(new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 16));
  // Default form capacity and ticket-type capacity are both 30.
  await expect(drawer.getByLabel('จำนวนผู้เข้าร่วมสูงสุด')).toHaveValue('30');
  await expect(drawer.getByLabel('จำนวนบัตร')).toHaveValue('30');

  page.once('dialog', dialog => dialog.accept());
  const createPromise = page.waitForResponse(r => r.request().method() === 'POST' &&
    new URL(r.url()).pathname === '/api/admin/events');
  await drawer.getByRole('button', { name: 'สร้างอีเวนต์' }).click();
  const created = await expectJsonResponse(await createPromise, 200);
  expect(created.title).toBe(title);
  expect(created.status).toBe('OPEN');
  await expect(page.locator('tr').filter({ hasText: title })).toBeVisible();
  await screenshot(page, info, 'admin-created-event');

  const userContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const user = await userContext.newPage();
    await login(user, ACCOUNTS.user, password);
    await user.goto('/event-detail/' + created.id);
    await expect(user.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(user.getByRole('button', { name: /ลงทะเบียน →/ })).toBeEnabled();
    await screenshot(user, info, 'new-event-visible-to-user');
  } finally { await userContext.close(); }
});
