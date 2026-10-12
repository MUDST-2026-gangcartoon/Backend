
# EventHub E2E Database Contract

## Purpose

Provide a repeatable, disposable H2 database for
Frontend/Backend E2E tests.

This profile is not intended for production.

## Runtime

- Profile: `e2e` only
- Database: dedicated H2 in-memory
- Schema: Hibernate `create-drop`
- Seeder: `E2ETestDataSeeder`
- Required environment: `APP_E2E_SEED_PASSWORD`
- Runtime: single application instance
- Never combine `e2e` with `prod` or `dev`

## Seed Accounts

All accounts use the password supplied through
`APP_E2E_SEED_PASSWORD`.

| Email | Role | Scenario |
|---|---|---|
| e2e.admin@example.com | ADMIN | Event management |
| e2e.staff@example.com | STAFF | Check-in |
| e2e.user@example.com | USER | New registration |
| e2e.pending@example.com | USER | Existing registration |
| e2e.checked@example.com | USER | Already checked in |

## Seed Events

### [E2E] Open Workshop

- Status: OPEN
- Capacity: 6
- General: capacity 4, price 100.00
- VIP: capacity 2, price 250.00
- Reserved seats: 3
- Remaining seats: 3
- Start time: 30 days after seeding

### [E2E] Full Workshop

- Status: FULL
- Capacity: 1
- General: capacity 1, price 0.00
- Reserved seats: 1
- Remaining seats: 0
- Start time: 31 days after seeding

## Registration Fixtures

| Ticket Code | Event | Quantity | Check-in |
|---|---|---:|---|
| E2E-PENDING-001 | Open Workshop | 2 | Pending |
| E2E-CHECKED-001 | Open Workshop | 1 | Completed |
| E2E-FULL-001 | Full Workshop | 1 | Pending |

Database-generated IDs are not fixed.
Tests must discover Event IDs through the API.

## Reset Contract

1. Stop the E2E application process.
2. Start a fresh process with the `e2e` profile.
3. Hibernate creates a new schema in H2 memory.
4. The E2E Seeder inserts the baseline fixtures.
5. Run E2E tests against the new baseline.

Do not reset shared databases while tests are running.

Restarting only an individual HTTP request is not a reset.

## Verification

Run:

`./mvnw clean verify`

Expected initial fixture counts:

- Users: 5
- Events: 2
- Ticket types: 3
- Registrations: 3
- Checked-in registrations: 1

## Safety

- Do not use production database credentials.
- Do not override the E2E JDBC URL with a real database.
- Use only one isolated E2E application instance.
- Never use `create-drop` in production.
- Never commit the E2E password to Git.
- Infrastructure owns Kubernetes deployment/reset orchestration.
- QA owns E2E scenarios and test execution.
