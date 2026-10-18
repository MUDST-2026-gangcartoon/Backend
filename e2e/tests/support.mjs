import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const E2E = {
  paidTitle: '[E2E] Open Workshop',
  userEmail: 'e2e.user@example.com',
  staffEmail: 'e2e.staff@example.com',
  adminEmail: 'e2e.admin@example.com',
};

export function requireIsolatedEnvironment() {
  if (process.env.E2E_CONFIRM_ISOLATED !== 'yes') {
    throw new Error('E2E_CONFIRM_ISOLATED=yes is required; verify the dedicated e2e H2 instance first.');
  }
  const password = process.env.E2E_SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('E2E_SEED_PASSWORD must match the isolated APP_E2E_SEED_PASSWORD.');
  }
  return password;
}

export async function responseJson(response, status) {
  const actualStatus = response.status();

  expect(
      actualStatus,
      `Expected HTTP ${status}, received HTTP ${actualStatus}: ${response.url()}`,
  ).toBe(status);

  // HTTP 204 ไม่มี Response Body จึงไม่ต้องอ่าน response.text()
  if ([204, 205, 304].includes(actualStatus)) {
    return null;
  }

  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

export async function screenshot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
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

export async function signup(page) {
  // Each scenario owns a different account. Do not rely on state from other tests.
  const email = 'e2e.auto.' + randomUUID().slice(0, 12) + '@example.test';
  const password = requireIsolatedEnvironment();
  await page.goto('/');
  await page.getByRole('link', { name: 'สมัครสมาชิก', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /สร้างบัญชีของคุณ/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('ชื่อที่แสดง').fill('E2E Auto QA');
  await dialog.getByLabel('อีเมล').fill(email);
  await dialog.getByLabel('รหัสผ่าน').fill(password);
  await dialog.getByRole('button', { name: 'สร้างบัญชีและเริ่มจอง' }).click();
  await expect(dialog).toBeHidden();
  return email;
}

export async function logout(page) {
  await page.locator('.user-profile-container .user-profile').first().click();
  await page.getByRole('button', { name: /ออกจากระบบ/ }).click();
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
}

export async function newRolePage(browser, email) {
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173' });
  const page = await context.newPage();
  await login(page, email, requireIsolatedEnvironment());
  return { context, page };
}

export async function ensureE2eBackend(request) {
  // Prevent accidental writes to dev/prod. Run with an isolated e2e instance only.
  const response = await request.get('/api/events?page=0&size=20');
  const data = await responseJson(response, 200);
  expect(Array.isArray(data.items)).toBe(true);
  expect(data.items.some(e => e.title === '[E2E] Full Workshop')).toBe(true);
  expect(data.items.some(e => e.title === '[E2E] Open Workshop')).toBe(true);
}

export async function discoverSeedPaidEvent(request) {
  await ensureE2eBackend(request);
  const data = await responseJson(await request.get('/api/events?page=0&size=20'), 200);
  const event = data.items.find(e => e.title === E2E.paidTitle);
  expect(event.status).toBe('OPEN');
  const detail = await responseJson(await request.get('/api/events/' + event.id), 200);
  const ticket = detail.ticketTypes.find(t => t.name === 'General');
  expect(ticket).toBeTruthy();
  expect(Number(ticket.price)).toBe(100);
  expect(Number(ticket.remaining)).toBeGreaterThan(0);
  return { eventId: event.id, ticketTypeId: ticket.id, price: 100, eventTitle: event.title };
}

export async function createEventViaAdmin(browser, options = {}) {
  const { context, page } = await newRolePage(browser, E2E.adminEmail);
  const name = options.title || '[E2E-AUTO] ' + randomUUID().slice(0, 8);
  const free = options.free === true;
  const ticketPrice = free ? 0 : (options.price ?? 100);
  try {
    await page.goto('/manage-events');
    await expect(page.getByRole('heading', { name: 'จัดการอีเวนต์' })).toBeVisible();
    await page.getByRole('button', { name: 'สร้างอีเวนต์', exact: true }).first().click();
    const dialog = page.getByRole('dialog').filter({ has: page.locator('#ev-name') });
    await expect(dialog).toBeVisible();
    await dialog.locator('#ev-name').fill(name);
    await dialog.locator('#ev-desc').fill('Automated browser E2E isolated test event.');
    await dialog.locator('#ev-place').fill('E2E Automation Hall');
    await dialog.locator('#ev-cat').selectOption('TECH');
    const startsAt = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);
    const dateLocal = [
      startsAt.getFullYear(),
      String(startsAt.getMonth() + 1).padStart(2, '0'),
      String(startsAt.getDate()).padStart(2, '0'),
    ].join('-') + 'T10:00';
    await dialog.locator('#ev-date').fill(dateLocal);
    await dialog.locator('#ev-max').fill('5');
    await dialog.locator('#ticket-name-0').fill(free ? 'Free Admission' : 'General');
    await dialog.locator('#ticket-price-0').fill(String(ticketPrice));
    await dialog.locator('#ticket-capacity-0').fill('5');
    const createdPromise = page.waitForResponse(res =>
      new URL(res.url()).pathname === '/api/admin/events' &&
      res.request().method() === 'POST'
    );
    // The UI calls window.alert on success. Accept that dialog without hiding backend errors.
    page.once('dialog', dialog => dialog.accept());
    await dialog.getByRole('button', { name: 'สร้างอีเวนต์' }).click();
    const event = await responseJson(await createdPromise, 200);
    expect(event.id).toBeTruthy();
    expect(event.title).toBe(name);
    expect(Number(event.capacity)).toBe(5);
    return { eventId: event.id, eventTitle: event.title,
      ticketTypeId: event.ticketTypes[0].id, price: ticketPrice };
  } finally {
    await context.close();
  }
}

export async function openBooking(page, event) {
  await page.goto('/event-detail/' + event.eventId);
  await expect(page.getByRole('heading', { name: event.eventTitle, exact: true })).toBeVisible();
  await page.getByRole('button', { name: /ลงทะเบียน →/ }).click();
  const booking = page.locator('.custom-modal-box').filter({ hasText: 'ลงทะเบียน: ' + event.eventTitle });
  await expect(booking).toBeVisible();
  await booking.locator('.modal-ticket-card').first().click();
  return booking;
}

export async function checkout(page, event) {
  expect(event.price).toBeGreaterThan(0);
  const booking = await openBooking(page, event);
  await expect(booking.locator('.total-section')).toContainText(String(event.price));
  const pendingPromise = page.waitForResponse(res =>
    new URL(res.url()).pathname === '/api/payments/mock/checkout' &&
    res.request().method() === 'POST'
  );
  await booking.getByRole('button', { name: 'ไปหน้าชำระเงิน' }).click();
  const pending = await responseJson(await pendingPromise, 201);
  expect(pending.status).toBe('PENDING_PAYMENT');
  expect(pending.eventId).toBe(event.eventId);
  expect(pending.ticketTypeId).toBe(event.ticketTypeId);
  expect(pending.quantity).toBe(1);
  expect(Number(pending.totalAmount)).toBe(event.price);
  expect(pending.paymentId).toBeTruthy();
  expect(pending.qrPayload).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toBeVisible();
  return pending;
}

export async function confirm(page, pending) {
  const p = page.waitForResponse(res =>
    new URL(res.url()).pathname === '/api/payments/mock/' + pending.paymentId + '/confirm' &&
    res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'ยืนยันการชำระเงิน (Demo)' }).click();
  const confirmed = await responseJson(await p, 200);
  expect(confirmed.paymentStatus).toBe('CONFIRMED');
  expect(confirmed.registration?.id).toBeTruthy();
  expect(confirmed.registration?.ticketCode).toMatch(/^GTH-[A-Z0-9]+$/);
  await expect(page.getByRole('heading', { name: 'ลงทะเบียนสำเร็จ!' })).toBeVisible();
  return confirmed;
}

export async function getRegistrations(page) {
  const result = await responseJson(await page.request.get('/api/registrations/me'), 200);
  expect(Array.isArray(result)).toBe(true);
  return result;
}

export async function checkInThroughUI(page, eventId, ticketCode, expected = 200) {
  await page.goto('/staff/checkin/' + eventId);
  await expect(page.getByRole('heading', { name: 'เช็กอินผู้เข้าร่วม' })).toBeVisible();
  const request = page.waitForResponse(res =>
    new URL(res.url()).pathname === '/api/staff/events/' + eventId + '/check-in' &&
    res.request().method() === 'POST'
  );
  await page.getByLabel('รหัสตั๋ว').fill(ticketCode);
  await page.getByRole('button', { name: 'เช็กอินตั๋ว' }).click();
  return responseJson(await request, expected);
}

export async function csrfPost(page, url) {
  const csrf = await responseJson(await page.request.get('/api/auth/csrf'), 200);
  expect(csrf.token).toBeTruthy();
  return page.request.post(url, {headers: {[csrf.headerName || 'X-CSRF-TOKEN']: csrf.token}});
}
