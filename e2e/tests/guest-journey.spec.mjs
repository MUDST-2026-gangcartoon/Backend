import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  createEventViaAdmin,
  ensureE2eBackend,
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
  await page.reload();
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
