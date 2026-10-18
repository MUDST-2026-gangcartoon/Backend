import { test, expect } from '@playwright/test';

const EVENT_TITLE = '[E2E] Open Workshop';
const USER_EMAIL = 'e2e.user@example.com';
const STAFF_EMAIL = 'e2e.staff@example.com';

function requireIsolatedEnvironment() {
  if (process.env.E2E_CONFIRM_ISOLATED !== 'yes') {
    throw new Error(
      'Refusing to execute: set E2E_CONFIRM_ISOLATED=yes only after verifying ' +
      'the backend runs with SPRING_PROFILES_ACTIVE=e2e and disposable H2.'
    );
  }
  const password = process.env.E2E_SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('E2E_SEED_PASSWORD must match APP_E2E_SEED_PASSWORD (never commit it).');
  }
  return password;
}

async function loginThroughUI(page, email, password) {
  await page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /เข้าสู่ระบบเพื่อลงทะเบียน/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('อีเมล').fill(email);
  await dialog.getByLabel('รหัสผ่าน').fill(password);
  await dialog.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(dialog).not.toBeVisible();
}

async function capture(page, info, name) {
  await info.attach(name, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
}

async function expectJsonResponse(response, code) {
  expect(response.status(), await response.text()).toBe(code);
  return response.json();
}

async function requireFreshE2ESeed(page) {
  const response = await page.request.get('/api/events?page=0&size=20');
  const data = await expectJsonResponse(response, 200);
  expect(Array.isArray(data.items), 'Expected paginated EventPageDto').toBe(true);

  // Fail closed if pointed at dev/prod or a reused, mutated test database.
  // Other independent tests may have added isolated events to the same E2E database.
  // Assert our two known fixtures rather than requiring a globally empty event list.
  const titles = data.items.map((item) => item.title).filter(t => t.startsWith('[E2E] ')).sort();
  expect(titles).toEqual(['[E2E] Full Workshop', EVENT_TITLE].sort());
  const event = data.items.find((item) => item.title === EVENT_TITLE);
  expect(event.status).toBe('OPEN');
  expect(Number(event.spotsLeft)).toBe(3);

  const detailResponse = await page.request.get('/api/events/' + event.id);
  const detail = await expectJsonResponse(detailResponse, 200);
  const general = detail.ticketTypes.find((item) => item.name === 'General');
  expect(general, 'Missing seeded General ticket').toBeTruthy();
  expect(Number(general.price)).toBe(100);
  expect(Number(general.remaining)).toBeGreaterThan(0);
  return { eventId: event.id, ticketTypeId: general.id };
}

test('E2E-AUTO-001: Paid Checkout → Confirm → My Tickets → Staff Check-in (real stack)', async ({ page }, testInfo) => {
  const password = requireIsolatedEnvironment();

  // Only API discovery / assertions: ALL business interactions happen through real UI.
  const { eventId, ticketTypeId } = await requireFreshE2ESeed(page);

  await page.goto('/');
  await loginThroughUI(page, USER_EMAIL, password);

  const initialRegistrationsResponse = await page.request.get('/api/registrations/me');
  const initialRegistrations = await expectJsonResponse(initialRegistrationsResponse, 200);
  expect(initialRegistrations.filter(r => r.event?.id === eventId)).toEqual([]);

  await page.goto('/event-detail/' + eventId);
  await expect(page.getByRole('heading', { name: EVENT_TITLE, exact: true })).toBeVisible();
  await page.getByRole('button', { name: /ลงทะเบียน →/ }).click();

  const booking = page.locator('.custom-modal-box').filter({ hasText: 'ลงทะเบียน: ' + EVENT_TITLE });
  await expect(booking).toBeVisible();
  await booking.getByRole('button', { name: /General/ }).click();
  await expect(booking.locator('.total-section')).toContainText('100');

  const checkoutPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/payments/mock/checkout' &&
    response.request().method() === 'POST'
  );
  await booking.getByRole('button', { name: 'ไปหน้าชำระเงิน' }).click();
  const checkout = await expectJsonResponse(await checkoutPromise, 201);

  expect(checkout.eventId).toBe(eventId);
  expect(checkout.ticketTypeId).toBe(ticketTypeId);
  expect(checkout.quantity).toBe(1);
  expect(Number(checkout.totalAmount)).toBe(100);
  expect(checkout.currency).toBe('THB');
  expect(checkout.status).toBe('PENDING_PAYMENT');
  expect(checkout.paymentId).toBeTruthy();
  expect(checkout.qrPayload).toBeTruthy();
  expect(checkout.ticketCode, 'Pending payment must not have a ticket').toBeFalsy();

  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toBeVisible();
  await capture(page, testInfo, '01-checkout-pending');

  const pendingPaymentResponse = await page.request.get('/api/payments/mock/' + checkout.paymentId);
  const pendingPayment = await expectJsonResponse(pendingPaymentResponse, 200);
  expect(pendingPayment.status).toBe('PENDING_PAYMENT');

  const beforeConfirmResponse = await page.request.get('/api/registrations/me');
  expect((await expectJsonResponse(beforeConfirmResponse, 200)).filter(r => r.event?.id === eventId)).toEqual([]);

  // Verify the browser UI also shows NO ticket before confirmation.
  await page.goto('/MyTicketsPage');
  await expect(page.locator('.myticket-card').filter({ hasText: EVENT_TITLE })).toHaveCount(0);
  await capture(page, testInfo, '02-no-ticket-before-confirm');

  // The production frontend restores a pending order from its localStorage + backend.
  await page.goto('/event-detail/' + eventId);
  await expect(page.getByRole('heading', { name: 'ชำระเงินสำหรับเดโม' })).toBeVisible();
  const confirmPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/payments/mock/' + checkout.paymentId + '/confirm' &&
    response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'ยืนยันการชำระเงิน (Demo)' }).click();
  const confirmed = await expectJsonResponse(await confirmPromise, 200);

  expect(confirmed.paymentStatus).toBe('CONFIRMED');
  expect(confirmed.registration).toBeTruthy();
  expect(confirmed.registration.id).toBeTruthy();
  const ticketCode = confirmed.registration.ticketCode;
  expect(ticketCode).toMatch(/^GTH-[A-Z0-9]+$/);
  expect(Number(confirmed.registration.totalPrice)).toBe(100);

  await expect(page.getByRole('heading', { name: 'ลงทะเบียนสำเร็จ!' })).toBeVisible();
  await expect(page.getByText(ticketCode, { exact: true })).toBeVisible();
  await capture(page, testInfo, '03-payment-confirmed');

  const confirmedStatusResponse = await page.request.get('/api/payments/mock/' + checkout.paymentId);
  const confirmedStatus = await expectJsonResponse(confirmedStatusResponse, 200);
  expect(confirmedStatus.status).toBe('CONFIRMED');

  await page.goto('/MyTicketsPage');
  const issuedTicket = page.locator('.myticket-card').filter({ hasText: ticketCode });
  await expect(issuedTicket).toBeVisible();
  await expect(issuedTicket.getByAltText('QR Code ของบัตร')).toBeVisible();
  await capture(page, testInfo, '04-issued-ticket-with-qr');

  const registrationsResponse = await page.request.get('/api/registrations/me');
  const registrations = await expectJsonResponse(registrationsResponse, 200);
  const workshopRegistrations = registrations.filter(r => r.event?.id === eventId);
  expect(workshopRegistrations).toHaveLength(1);
  expect(workshopRegistrations[0].id).toBe(confirmed.registration.id);
  expect(workshopRegistrations[0].ticketCode).toBe(ticketCode);

  // Log out through the real UI before changing roles.
  await page.locator('.user-profile-container .user-profile').first().click();
  await page.getByRole('button', { name: /ออกจากระบบ/ }).click();
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();

  await loginThroughUI(page, STAFF_EMAIL, password);
  await page.goto('/staff/checkin/' + eventId);
  await expect(page.getByRole('heading', { name: 'เช็กอินผู้เข้าร่วม' })).toBeVisible();

  const checkinPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/staff/events/' + eventId + '/check-in' &&
    response.request().method() === 'POST'
  );
  await page.getByLabel('รหัสตั๋ว').fill(ticketCode);
  await page.getByRole('button', { name: 'เช็กอินตั๋ว' }).click();
  const firstCheckin = await expectJsonResponse(await checkinPromise, 200);
  expect(firstCheckin.checkedIn).toBe(true);
  expect(firstCheckin.ticketCode).toBe(ticketCode);
  expect(firstCheckin.checkedInAt).toBeTruthy();
  await expect(page.getByText(/ตั๋วนี้เช็กอินแล้ว/)).toBeVisible();
  await capture(page, testInfo, '05-staff-checkin');

  // Current backend behavior: repeated check-in is idempotent (HTTP 200),
  // NOT a 409. Assert no second check-in timestamp is created.
  const repeatPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/staff/events/' + eventId + '/check-in' &&
    response.request().method() === 'POST'
  );
  await page.getByLabel('รหัสตั๋ว').fill(ticketCode);
  await page.getByRole('button', { name: 'เช็กอินตั๋ว' }).click();
  const repeatedCheckin = await expectJsonResponse(await repeatPromise, 200);
  expect(repeatedCheckin.ticketCode).toBe(ticketCode);
  expect(repeatedCheckin.checkedIn).toBe(true);
  expect(repeatedCheckin.checkedInAt).toBe(firstCheckin.checkedInAt);

  const attendeesResponse = await page.request.get('/api/staff/events/' + eventId + '/attendees');
  const attendees = await expectJsonResponse(attendeesResponse, 200);
  const sameTicket = attendees.filter((attendee) => attendee.ticketCode === ticketCode);
  expect(sameTicket).toHaveLength(1);
  expect(sameTicket[0].checkedInAt).toBe(firstCheckin.checkedInAt);

  await capture(page, testInfo, '06-repeat-checkin-idempotent');
});
