
# EventHub Mock Payment — Backend Handoff

## Scope

EventHub uses a simulated payment workflow only.

No real funds are transferred and no external payment gateway
is connected.

## API Contract

| Method | Path | Result |
|---|---|---|
| POST | /api/payments/mock/checkout | 201 |
| POST | /api/payments/mock/{id}/confirm | 200 |
| GET | /api/payments/mock/{id} | 200 |
| POST | /api/payments/mock/{id}/cancel | 200 |

All Mock Payment APIs require ROLE_USER.

POST requests require X-CSRF-TOKEN.

Payment ownership is enforced by MockPaymentService.

## Business Rules

- Free tickets use the existing Registration API.
- Paid tickets must use Mock Payment.
- Checkout creates PENDING_PAYMENT only.
- Pending payments do not reserve seats.
- Pending payments expire after 10 minutes.
- Confirm checks price, availability, ownership and duplicates.
- Successful Confirm creates exactly one Registration.
- Repeated Confirm returns the original Registration.
- Confirming an expired or cancelled order returns 409.
- Missing or inaccessible payments return 404.
- Payment history remains after Registration cancellation.
- Cancelled tickets cannot be used for Staff Check-in.
- Payment QR payload is demo-only.

## Concurrency

Checkout serializes operations using the Event row lock.

Confirmation uses a Payment row lock and an Event row lock.

Registration creation and Payment Confirmation occur in
the same database transaction.

Real database integration tests must validate concurrency
and rollback, not only Mockito unit tests.

## Testing

Run all tests:

./mvnw clean verify

Required suites include:

- MockPaymentCheckoutServiceTests
- MockPaymentConfirmServiceTests
- MockPaymentStatusServiceTests
- MockPaymentHttpSecurityTests
- MockPaymentFlowIT
- MockPaymentSecurityIT
- MockPaymentTransactionIT
- MockPaymentConcurrencyIT
- EventServiceTests

## Frontend Integration

Paid Ticket:
Checkout -> Pending -> Confirm -> Registration -> QR Ticket

Free Ticket:
Registration -> QR Ticket

The checkout QR is not a bank payment QR.

Only a confirmed Registration issues an active Ticket Code.

## Deployment Notes

- Backend and Infrastructure must agree on database schema setup.
- HTTP Sessions and CSRF must remain functional behind Ingress.
- Database transactions and pessimistic locks must be supported.
- Tests must run on an isolated non-production database.

## Release Gate

- Maven clean verify passes.
- Real H2 integration tests pass.
- Concurrent checkout/confirm tests pass.
- Existing regression tests pass.
- QA reviews Green CI evidence.
