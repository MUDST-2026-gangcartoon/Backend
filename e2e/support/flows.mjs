import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const ACCOUNTS = {
  user: 'e2e.user@example.com',
  other: 'e2e.pending@example.com',
  staff: 'e2e.staff@example.com',
  admin: 'e2e.admin@example.com',
};

export function requireE2EPassword() {
  if (process.env.E2E_CONFIRM_ISOLATED !== 'yes') {
    throw new Error('E2E_CONFIRM_ISOLATED=yes is required. Confirm isolated E2E H2 before running.');
  }
  const password = process.env.E2E_SEED_PASSWORD;
  if (!password || password.length < 8) throw new Error('Set E2E_SEED_PASSWORD to the seed-only test password.');
  return password;
}

export async function expectJsonResponse(response, status) {
  expect(response.status(), (await response.text()).slice(0, 500)).toBe(status);
  return response.json();
}

export async function verifyE2ESeed(page) {
  requireE2EPassword();
  const data = await expectJsonResponse(await page.request.get('/api/events?page=0&size=20'), 200);
  expect(Array.isArray(data.items)).toBe(true);
  const seeded = data.items.filter(e => e.title.startsWith('[E2E] '));
  expect(seeded.map(e => e.title).sort()).toEqual(['[E2E] Full Workshop', '[E2E] Open Workshop'].sort());
  const open = seeded.find(e => e.title === '[E2E] Open Workshop');
  const full = seeded.find(e => e.title === '[E2E] Full Workshop');
  expect(full.status).toBe('FULL');
  const detail = await expectJsonResponse(await page.request.get('/api/events/' + open.id), 200);
  expect(detail.ticketTypes.some(t => t.name === 'General' && Number(t.price) === 100)).toBe(true);
  // This confirms our intended fixed E2E fixtures, not an arbitrary dev environment.
  return detail;
}

export async function login(page, email, password) {
  await page.goto('/');
  await page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /เข้าสู่ระบบเพื่อลงทะเบียน/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('อีเมล').fill(email);
  await dialog.getByLabel('รหัสผ่าน').fill(password);
  await dialog.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(dialog).toBeHidden();
}

export async function logoutUser(page) {
  await page.goto('/');
  await page.locator('.user-profile-container .user-profile').first().click();
  await page.getByRole('button', { name: /ออกจากระบบ/ }).click();
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
}

export async function screenshot(page, testInfo, key) {
  await testInfo.attach(key, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
}

export async function currentRegistrations(page) {
  const data = await expectJsonResponse(await page.request.get('/api/registrations/me'), 200);
  return Array.isArray(data) ? data : data.items ?? data.registrations ?? [];
}

export async function startBooking(page, eventId, ticketName = 'General') {
  await page.goto('/event-detail/' + eventId);
  await page.getByRole('button', { name: /ลงทะเบียน →/ }).click();
  const modal = page.locator('.custom-modal-box').filter({ hasText: 'เลือกประเภทบัตร' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: new RegExp(ticketName) }).click();
  return modal;
}

export async function checkoutPaid(page, eventId, ticketName = 'General') {
  const modal = await startBooking(page, eventId, ticketName);
  const promise = page.waitForResponse(r => r.request().method() === 'POST' &&
    new URL(r.url()).pathname === '/api/payments/mock/checkout');
  await modal.getByRole('button', { name: 'ไปหน้าชำระเงิน' }).click();
  const result = await expectJsonResponse(await promise, 201);
  expect(result.status).toBe('PENDING_PAYMENT');
  expect(result.eventId).toBe(eventId);
  expect(result.quantity).toBe(1);
  expect(result.paymentId).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toBeVisible();
  return result;
}

export async function confirmPaid(page, paymentId) {
  const promise = page.waitForResponse(r => r.request().method() === 'POST' &&
    new URL(r.url()).pathname === '/api/payments/mock/' + paymentId + '/confirm');
  await page.getByRole('button', { name: 'ยืนยันการชำระเงิน (Demo)' }).click();
  const data = await expectJsonResponse(await promise, 200);
  expect(data.paymentStatus).toBe('CONFIRMED');
  expect(data.registration?.ticketCode).toMatch(/^GTH-[0-9A-Z]+$/);
  await expect(page.getByRole('heading', { name: 'ลงทะเบียนสำเร็จ!' })).toBeVisible();
  return data;
}

export async function registerFree(page, eventId) {
  const modal = await startBooking(page, eventId);
  const promise = page.waitForResponse(r => r.request().method() === 'POST' &&
    new URL(r.url()).pathname === '/api/events/' + eventId + '/registrations');
  await modal.getByRole('button', { name: 'ยืนยันลงทะเบียน' }).click();
  const reg = await expectJsonResponse(await promise, 200);
  expect(reg.ticketCode).toMatch(/^GTH-[0-9A-Z]+$/);
  expect(Number(reg.totalPrice)).toBe(0);
  await expect(page.getByRole('heading', { name: 'ลงทะเบียนสำเร็จ!' })).toBeVisible();
  return reg;
}

export async function staffCheckin(page, eventId, ticketCode, expectedCode = 200) {
  await page.goto('/staff/checkin/' + eventId);
  await expect(page.getByRole('heading', { name: 'เช็กอินผู้เข้าร่วม' })).toBeVisible();
  const promise = page.waitForResponse(r => r.request().method() === 'POST' &&
    new URL(r.url()).pathname === '/api/staff/events/' + eventId + '/check-in');
  await page.getByLabel('รหัสตั๋ว').fill(ticketCode);
  await page.getByRole('button', { name: 'เช็กอินตั๋ว' }).click();
  const response = await promise;
  expect(response.status(), (await response.text()).slice(0, 400)).toBe(expectedCode);
  return expectedCode === 200 ? response.json() : response;
}

// Only for arranging an isolated test fixture. The scenario itself uses real browser UI.
// Never use API mocks or direct database writes.
export async function seedEventViaAdmin(browser, password, name, price = 0, capacity = 8) {
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  try {
    const page = await context.newPage();
    await verifyE2ESeed(page);
    await login(page, ACCOUNTS.admin, password);
    const csrf = await expectJsonResponse(await page.request.get('/api/auth/csrf'), 200);
    const date = new Date(Date.now() + 35 * 86400_000).toISOString().slice(0, 19);
    const payload = {
      title: name,
      description: 'กิจกรรมสำหรับทดสอบ Playwright โดยเฉพาะ',
      location: 'ห้องทดสอบ QA',
      startsAt: date,
      capacity,
      category: 'TECH',
      imageUrl: '',
      detailImages: [],
      ticketTypes: [{
        name: 'General', description: 'Automated E2E', price, capacity,
      }],
    };
    const response = await page.request.post('/api/admin/events', {
      data: payload,
      headers: { [csrf.headerName || 'X-CSRF-TOKEN']: csrf.token },
    });
    const created = await expectJsonResponse(response, 200);
    expect(created.id).toBeTruthy();
    expect(created.ticketTypes?.[0]?.price).toBeDefined();
    return created;
  } finally {
    await context.close();
  }
}

export function uniqueEventTitle(prefix) {
  // UUID is used only for new test-fixture event names, never fixed event IDs.
  return '[QA AUTO] ' + prefix + ' ' + randomUUID().slice(0, 8);
}
