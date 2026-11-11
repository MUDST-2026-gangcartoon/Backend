import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  checkInThroughUI,
  createEventViaAdmin,
  E2E,
  ensureE2eBackend,
  getRegistrations,
  newRolePage,
  openBooking,
  requireIsolatedEnvironment,
  responseJson,
} from './support.mjs';

const guestName = 'E2E Guest';
const guestEmail = () => `guest-${randomUUID()}@example.test`;
const bookingQr = (page) => page.getByAltText('QR Code สำหรับบัตร', { exact: true });

function waitForPost(page, path) {
  return page.waitForResponse((response) =>
    new URL(response.url()).pathname === path && response.request().method() === 'POST'
  );
}

async function openGuestBooking(page, event, email) {
  const booking = await openBooking(page, event);
  await booking.getByLabel('ชื่อผู้เข้าร่วม').fill(guestName);
  await booking.getByLabel('อีเมล').fill(email);
  return booking;
}

async function startGuestCheckout(page, event, email) {
  const booking = await openGuestBooking(page, event, email);
  const checkedOut = waitForPost(page, `/api/guest/events/${event.eventId}/checkout`);
  await booking.getByRole('button', { name: 'ไปหน้าชำระเงิน', exact: true }).click();
  const order = await responseJson(await checkedOut, 201);
  expect(order).toMatchObject({ eventId: event.eventId, quantity: 1, status: 'PENDING_PAYMENT' });
  expect(Number(order.totalAmount)).toBe(event.price);
  expect(order.paymentId).toBeTruthy();
  expect(order.registration).toBeNull();
  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toBeVisible();
  await expect(bookingQr(page)).toHaveCount(0);
  return order;
}

test.beforeEach(async ({ request }) => {
  requireIsolatedEnvironment();
  await ensureE2eBackend(request);
});

test('Guest free booking issues a session-bound ticket and cancellation hides the QR', async ({ page, browser }) => {
  const event = await createEventViaAdmin(browser, { free: true });
  const booking = await openGuestBooking(page, event, guestEmail());
  const registered = waitForPost(page, `/api/guest/events/${event.eventId}/registrations`);
  await booking.getByRole('button', { name: 'ยืนยันลงทะเบียน', exact: true }).click();
  const receipt = await responseJson(await registered, 201);
  expect(receipt).toMatchObject({ eventId: event.eventId, quantity: 1, status: 'CONFIRMED' });
  expect(receipt.ticketCode).toMatch(/^GTH-[A-Z0-9]+$/);
  await expect(bookingQr(page)).toBeVisible();

  const receiptPath = `/api/guest/bookings/${receipt.registrationId}`;
  const stranger = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
  try {
    expect((await stranger.request.get(receiptPath)).status()).toBe(404);
  } finally {
    await stranger.close();
  }
  await page.getByRole('button', { name: 'ไปที่บัตรที่จองไว้' }).click();
  await expect(page.getByRole('heading', { name: 'บัตรที่จองไว้' })).toBeVisible();
  await page.context().clearCookies({ name: 'EVENTHUB_SESSION' });
  await page.reload();
  await expect(page.getByAltText('QR สำหรับเช็กอิน')).toBeVisible();
  await expect(page.getByText(receipt.ticketCode, { exact: true })).toBeVisible();
  expect((await page.request.get('/favicon.ico')).headers()['content-type']).toMatch(/image/);
  expect((await page.request.get('/api/auth/session')).status()).toBe(204);

  await page.goto(`/event-detail/${event.eventId}`);
  await expect(page.getByText(receipt.ticketCode, { exact: true })).toBeVisible();

  const cancelled = waitForPost(page, `${receiptPath}/cancel`);
  await page.getByRole('button', { name: 'ยกเลิกการลงทะเบียน', exact: true }).click();
  expect(await responseJson(await cancelled, 200)).toMatchObject({
    registrationId: receipt.registrationId, status: 'CANCELLED',
  });
  await expect(page.getByRole('heading', { name: 'ยกเลิกการลงทะเบียนแล้ว' })).toBeVisible();
  await expect(bookingQr(page)).toHaveCount(0);
  await expect(page.getByText(receipt.ticketCode, { exact: true })).toHaveCount(0);
});

test('Guest reloads the same pending payment and can cancel without issuing a ticket', async ({ page, browser }) => {
  const event = await createEventViaAdmin(browser, { price: 100 });
  const order = await startGuestCheckout(page, event, guestEmail());
  const paymentPath = `/api/guest/payments/${order.paymentId}`;
  const resumed = page.waitForResponse((response) =>
    new URL(response.url()).pathname === paymentPath && response.request().method() === 'GET'
  );
  await page.reload();
  expect(await responseJson(await resumed, 200)).toMatchObject({
    paymentId: order.paymentId, status: 'PENDING_PAYMENT', registration: null,
  });
  await expect(page.getByText(`หมายเลขรายการ: ${order.paymentId}`, { exact: true })).toBeVisible();

  const cancelled = waitForPost(page, `${paymentPath}/cancel`);
  await page.getByRole('button', { name: 'ยกเลิกรายการ', exact: true }).click();
  expect(await responseJson(await cancelled, 200)).toMatchObject({
    paymentId: order.paymentId, status: 'CANCELLED', registration: null,
  });
  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toHaveCount(0);
  await expect(bookingQr(page)).toHaveCount(0);
});

async function readGuestOtp(mailbox, email) {
  let code;
  await expect.poll(async () => {
    let messages;
    try {
      messages = await readFile(mailbox, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
    code = messages.trim().split('\n').filter(Boolean).map(JSON.parse)
      .findLast((message) => message.email === email)?.code;
    return /^\d{6}$/.test(code ?? '');
  }, { message: 'The local SMTP inbox should receive a six-digit code for the test account' }).toBe(true);
  return code;
}

test('Guest pays, claims the original ticket, and appears in Staff check-in and the Admin funnel', async ({ page, browser }) => {
  const mailbox = process.env.E2E_GUEST_MAILBOX;
  if (!mailbox) throw new Error('Run the isolated Guest suite with python e2e/run-guest.py.');

  const email = guestEmail();
  const event = await createEventViaAdmin(browser, { price: 100 });
  const order = await startGuestCheckout(page, event, email);
  const paymentConfirmed = waitForPost(page, `/api/guest/payments/${order.paymentId}/confirm`);
  await page.getByRole('button', { name: 'ยืนยันการชำระเงิน (Demo)', exact: true }).click();
  const payment = await responseJson(await paymentConfirmed, 200);
  expect(payment).toMatchObject({ paymentId: order.paymentId, status: 'CONFIRMED' });
  const receipt = payment.registration;
  expect(receipt).toMatchObject({ eventId: event.eventId, quantity: 1, status: 'CONFIRMED' });
  expect(receipt.registrationId).toBeTruthy();
  expect(receipt.ticketCode).toMatch(/^GTH-[A-Z0-9]+$/);
  await expect(bookingQr(page)).toBeVisible();
  await expect(page.getByText(receipt.ticketCode, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'เข้าสู่ระบบเพื่อรับรายการ', exact: true }).click();
  const login = page.getByRole('dialog', { name: /เข้าสู่ระบบเพื่อลงทะเบียน/ });
  await login.getByRole('link', { name: 'สร้างบัญชีใหม่' }).click();
  const signup = page.getByRole('dialog', { name: 'สร้างบัญชีของคุณ' });
  await signup.getByLabel('ชื่อที่แสดง').fill(guestName);
  await signup.getByLabel('อีเมล').fill(email);
  await signup.getByLabel('รหัสผ่าน').fill(requireIsolatedEnvironment());
  await signup.getByRole('button', { name: 'สร้างบัญชีและเริ่มจอง' }).click();
  await expect(page).toHaveURL(/\/MyRegistrationsPage\?from=guest$/);
  expect(await getRegistrations(page)).toEqual([]);

  await page.getByRole('button', { name: 'รับรายการเข้าบัญชี', exact: true }).click();
  const requested = waitForPost(page, '/api/auth/email-verification/request');
  await page.getByRole('button', { name: 'ส่งรหัสยืนยัน', exact: true }).click();
  expect((await requested).status()).toBe(202);
  const code = await readGuestOtp(mailbox, email);
  const input = page.getByLabel('รหัสยืนยัน 6 หลัก');
  const confirm = page.getByRole('button', { name: 'ยืนยันและรับรายการ', exact: true });

  await input.fill(code === '000000' ? '000001' : '000000');
  const invalid = waitForPost(page, '/api/auth/email-verification/confirm');
  await confirm.click();
  expect((await invalid).status()).toBe(400);
  await expect(page.getByText(/รหัสไม่ถูกต้องหรือหมดอายุ/)).toBeVisible();
  expect(await getRegistrations(page)).toEqual([]);

  await input.fill(code);
  const verified = waitForPost(page, '/api/auth/email-verification/confirm');
  const claimed = waitForPost(page, '/api/registrations/claim-guest');
  await confirm.click();
  expect((await verified).status()).toBe(204);
  expect(await responseJson(await claimed, 200)).toEqual({ claimedRegistrations: 1 });
  await expect(page.getByText('รับรายการเข้าบัญชีแล้ว 1 รายการ')).toBeVisible();
  const history = await getRegistrations(page);
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    id: receipt.registrationId, ticketCode: receipt.ticketCode, quantity: receipt.quantity,
  });
  expect(await responseJson(await page.request.get('/api/guest/bookings'), 200)).toEqual([]);
  await page.goto('/MyTicketsPage');
  const ticket = page.locator('.myticket-card').filter({ hasText: receipt.ticketCode });
  await expect(ticket.getByAltText(/^QR Code ของ /)).toBeVisible();

  const staff = await newRolePage(browser, E2E.staffEmail);
  try {
    const checkIn = await checkInThroughUI(staff.page, event.eventId, receipt.ticketCode);
    expect(checkIn).toMatchObject({ result: 'CHECKED_IN', ticketCode: receipt.ticketCode });
    await expect(staff.page.getByText('เช็กอินสำเร็จ', { exact: true })).toBeVisible();
    const attendees = await responseJson(
      await staff.page.request.get(`/api/staff/events/${event.eventId}/attendees`), 200,
    );
    const checkedInGuest = attendees.filter((row) => row.ticketCode === receipt.ticketCode);
    expect(checkedInGuest).toHaveLength(1);
    expect(checkedInGuest[0]).toMatchObject({ origin: 'GUEST', claimStatus: 'CLAIMED' });
    await expect(staff.page.getByText('จองแบบ Guest · ผูกบัญชีแล้ว', { exact: true })).toBeVisible();
  } finally {
    await staff.context.close();
  }

  const admin = await newRolePage(browser, E2E.adminEmail);
  try {
    await admin.page.goto('/admin/dashboard');
    const chart = admin.page.getByRole('region', { name: 'เส้นทางการจองทุกอีเวนต์' });
    const overview = admin.page.getByRole('region', { name: 'อีเวนต์ที่ต้องดูแล' });
    await expect(overview.getByRole('heading', { name: 'วันนี้และงานที่กำลังจัด' })).toBeVisible();
    await expect(chart).toHaveCount(0);
    await expect(admin.page.getByRole('tablist', { name: 'เลือกอีเวนต์' })).toHaveCount(0);

    await admin.page.getByRole('button', { name: 'สถิติเชิงลึก', exact: true }).click();
    await expect(chart.getByRole('list', { name: 'กราฟขั้นตอนการจอง' })).toBeVisible();
    await expect(overview).toHaveCount(0);

    const earlier = new Date(receipt.registeredAt.slice(0, 10) + 'T00:00:00Z');
    earlier.setUTCDate(earlier.getUTCDate() - 2);
    const day = earlier.toISOString().slice(0, 10);
    earlier.setUTCDate(earlier.getUTCDate() + 1);
    const exclusiveEnd = earlier.toISOString().slice(0, 10);
    const fromDate = chart.getByLabel('ตั้งแต่วันที่');
    const throughDate = chart.getByLabel('ถึงวันที่');
    const applyDates = chart.getByRole('button', { name: 'ใช้ช่วงวันที่', exact: true });
    const originalFrom = await fromDate.inputValue();
    const originalThrough = await throughDate.inputValue();
    const appliedDate = chart.getByText(/^กำลังแสดงข้อมูล/);
    const originalAppliedDate = await appliedDate.innerText();
    await expect(applyDates).toBeDisabled();

    await fromDate.fill(day);
    await throughDate.fill(day);
    await expect(applyDates).toBeEnabled();
    const filteredOverview = admin.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/admin/analytics/funnel' && !url.searchParams.has('eventId') &&
        url.searchParams.get('from') === day && url.searchParams.get('to') === exclusiveEnd;
    });
    await applyDates.click();
    const overviewData = await responseJson(await filteredOverview, 200);
    expect(overviewData.total.startedAttempts).toBe(0);
    await expect(chart.getByText('ไม่พบการเริ่มจองผ่านเว็บในช่วงนี้')).toBeVisible();
    await expect(appliedDate).not.toHaveText(originalAppliedDate);
    await expect(applyDates).toBeDisabled();

    await fromDate.fill(originalFrom);
    await throughDate.fill(originalThrough);
    await applyDates.click();
    await expect(chart.getByRole('list', { name: 'กราฟขั้นตอนการจอง' })).toBeVisible();
    await expect(appliedDate).toHaveText(originalAppliedDate);

    await admin.page.getByRole('button', { name: 'รายอีเวนต์', exact: true }).click();
    await admin.page.getByRole('tab').filter({ hasText: event.eventTitle }).click();
    await expect(chart).toHaveCount(0);
    await expect(admin.page.getByRole('button', { name: 'คัดลอกอีเมล' })).toBeVisible();
    await admin.page.getByRole('button', { name: 'สรุปอีเวนต์', exact: true }).click();
    await expect(admin.page.getByText('จาก 1 รายการจอง · ไม่นับที่ยกเลิก')).toBeVisible();
    await admin.page.getByRole('button', { name: 'เปรียบเทียบการจอง', exact: true }).click();
    const report = admin.page.getByRole('region', { name: 'รายงานขั้นตอนการลงทะเบียน' });
    await expect(report.getByRole('list', { name: 'กราฟขั้นตอนการจอง' })).toHaveCount(0);
    const cells = (name) => report.getByRole('row', { name }).getByRole('cell');
    await expect(cells(/^เริ่มจอง /)).toHaveText(['1', '1', '0']);
    await expect(cells(/^จองสำเร็จ /)).toHaveText(['1', '1', '0']);
    await expect(cells(/ที่นั่งที่เช็กอินแล้ว/)).toHaveText(['1', '1', '0']);
    await expect(cells(/เปอร์เซ็นต์เช็กอิน/)).toHaveText(['100%', '100%', '—']);

    await report.getByLabel('ตั้งแต่วันที่').fill(day);
    await report.getByLabel('ถึงวันที่').fill(day);
    const filtered = admin.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/admin/analytics/funnel' &&
        url.searchParams.get('eventId') === String(event.eventId) &&
        url.searchParams.get('from') === day;
    });
    await report.getByRole('button', { name: 'ใช้ช่วงวันที่', exact: true }).click();
    const empty = await responseJson(await filtered, 200);
    expect(empty).toMatchObject({
      eventId: event.eventId, from: day, to: exclusiveEnd,
      guest: { startedAttempts: 0, confirmedOrders: 0, checkedInSeats: 0 },
    });
    await expect(report.getByText('ไม่มีข้อมูลในช่วงวันที่เลือก')).toBeVisible();
    await expect(cells(/เปอร์เซ็นต์เช็กอิน/)).toHaveText(['—', '—', '—']);
  } finally {
    await admin.context.close();
  }
});
