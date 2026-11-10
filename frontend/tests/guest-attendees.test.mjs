import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingsToCsv, normalizeBookings } from '../src/utils/bookingModel.js';

test('guest booking origin and claim status survive normalization and CSV export', () => {
  const rows = normalizeBookings([
    { registrationId: 7, name: 'Guest', email: 'guest@example.test', origin: 'GUEST', claimStatus: 'CLAIMED', quantity: 2, ticketCode: 'ABC', status: 'CONFIRMED' },
    { registrationId: 8, name: 'Member', origin: 'USER', quantity: 1, ticketCode: 'DEF', status: 'CONFIRMED' },
  ]);
  assert.equal(rows[0].key, 7);
  assert.equal(rows[0].origin, 'GUEST');
  assert.equal(rows[0].claimStatus, 'CLAIMED');
  const csv = bookingsToCsv(rows);
  assert.match(csv, /"GUEST"/);
  assert.match(csv, /"CLAIMED"/);
  assert.match(csv, /"USER"/);
  assert.match(csv, /"ABC"/);
});
