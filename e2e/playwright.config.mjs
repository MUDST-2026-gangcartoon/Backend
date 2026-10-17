import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
// Deliberately refuse remote/live websites: the test creates payment and check-in data.
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(baseURL)) {
  throw new Error('Browser E2E requires a loopback HTTP URL, e.g. http://127.0.0.1:5173');
}

// Full suite is intentionally limited to 2 spec files: 1 original P0 + 9 complementary E2E cases.
// The alternate P1 draft spec is preserved but not run automatically to avoid duplicate tests.
const suite = process.env.E2E_SUITE || 'all';
if (!['all', 'fast', 'core', 'extended', 'slow'].includes(suite)) {
  throw new Error('E2E_SUITE must be all, fast, core, extended or slow');
}
const match = suite === 'core'
  ? ['**/paid-ticket-checkin.spec.mjs', '**/additional-critical-flows.spec.mjs']
  : suite === 'extended' || suite === 'slow'
    ? ['**/additional-flows.spec.mjs']
    : ['**/paid-ticket-checkin.spec.mjs', '**/additional-flows.spec.mjs'];

export default defineConfig({
  testDir: './tests',
  testMatch: match,
  grep: suite === 'slow' ? /@slow/ : undefined,
  grepInvert: suite === 'fast' || suite === 'core' || suite === 'extended' ? /@slow/ : undefined,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/html', open: 'never' }],
    ['junit', { outputFile: 'artifacts/junit.xml' }],
  ],
  outputDir: 'artifacts/test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 25_000,
  },
});
