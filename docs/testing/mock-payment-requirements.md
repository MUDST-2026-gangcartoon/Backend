# Mock Payment System — Test Requirements & Acceptance Criteria

**Project:** EventHub  
**Component:** Spring Boot Backend  
**Feature Branch:** `feat/backend-mock-payment`  
**QA Branch:** `test/mock-payment-first`  
**Development Approach:** Test-first / Red → Green  
**Status:** Requirements for QA — Implementation Pending

---

## 1. Objective

พัฒนาระบบ Mock Payment เพื่อรองรับการลงทะเบียน Event แบบบัตรฟรีและบัตรเสียเงิน โดยไม่มีการเชื่อมต่อ Payment Gateway หรือการโอนเงินจริง

ระบบต้องทำงานร่วมกับ Event, TicketType, Registration, Authentication, CSRF และ Staff Check-in เดิม

QA ต้องเขียน Tests จาก Requirements นี้ก่อนที่ Backend จะ Implement Payment Business Logic

**สำคัญ:** Service Skeleton ที่มี `UnsupportedOperationException` ยังไม่ถือว่า Implement แล้ว

## 2. Scope

### In Scope

- Free Ticket Registration
- Paid Ticket Mock Checkout
- Mock Payment Confirmation
- Payment Status และ Cancellation
- Price Snapshot
- Event / Ticket Type Capacity
- Prevention of Duplicate Registrations
- Transaction Safety
- Concurrent Confirmation
- Payment Ownership
- Authentication และ CSRF
- Payment History
- Existing Staff Check-in Compatibility
- Unit Tests, Integration Tests และ Regression Tests

### Out of Scope

- Payment Gateway จริง
- Stripe, Omise หรือ PromptPay Integration
- การตรวจสอบเงินโอนจริง
- Refund เงินจริง
- Banking QR Code
- Background Payment Worker
- การแก้ Frontend ใน QA Branch

## 3. Business Rules

### BR-PAY-001 — Free Ticket

เมื่อ Ticket Type มีราคา `0.00` บาท ผู้ใช้ต้องสามารถลงทะเบียนด้วย Registration API เดิม

Flow:

`Select Ticket → Register → Registration → Ticket Code → QR Ticket`

Expected:

- ไม่ต้องสร้าง Payment Order
- สร้าง Registration สำเร็จ
- สร้าง Ticket Code ด้วยกลไกเดิม
- ตรวจ Event Capacity และ Ticket Type Capacity
- ป้องกัน Registration ซ้ำ
- Staff Check-in ใช้งานได้

### BR-PAY-002 — Paid Ticket

เมื่อ Ticket Type มีราคามากกว่า `0.00` บาท ต้องผ่าน Mock Payment

Flow:

`Select Ticket → Checkout → PENDING_PAYMENT → Confirm → CONFIRMED → Registration → Ticket Code`

Expected:

- Checkout ยังไม่สร้าง Registration
- Checkout ยังไม่สร้าง Ticket Code
- Pending Payment ไม่จอง Capacity
- Confirm ต้องตรวจ Capacity ใหม่
- สร้าง Registration หลัง Confirm สำเร็จเท่านั้น
- Confirm และการบันทึก Registration ต้องอยู่ใน Database Transaction เดียวกัน

### BR-PAY-003 — Prevent Payment Bypass

Registration API เดิม:

`POST /api/events/{eventId}/registrations`

ต้องปฏิเสธการออกตั๋วสำหรับ Paid Ticket

ห้ามใช้ข้อมูลจาก Client เช่น `paymentConfirmed: true` เพื่อข้าม Payment Flow

### BR-PAY-004 — Payment Amount

Backend ต้องอ่านราคาจริงจาก TicketType ใน Database

`totalAmount = unitPrice × quantity`

ข้อกำหนด:

- ใช้ BigDecimal
- Quantity อยู่ระหว่าง 1–10
- ไม่เชื่อราคาจาก Client
- เก็บราคาขณะ Checkout เป็น Price Snapshot
- เปรียบเทียบราคาปัจจุบันกับ Snapshot ก่อน Confirm โดยเปรียบเทียบค่าทางตัวเลข ไม่ใช่ความต่างของ Decimal Scale

### BR-PAY-005 — Pending Payment

- สถานะเริ่มต้นเป็น `PENDING_PAYMENT`
- อายุ Payment เริ่มต้น 10 นาที
- ไม่สร้าง Registration
- ไม่สร้าง Ticket Code
- ไม่ลด Capacity
- ไม่ใช่การจองที่นั่ง
- ถ้า Capacity ถูกใช้หมดก่อน Confirm ต้องปฏิเสธการยืนยัน

### BR-PAY-006 — Payment Status

สถานะทั้งหมด:

| Status | Meaning |
|---|---|
| PENDING_PAYMENT | รอยืนยันการชำระเงินจำลอง |
| CONFIRMED | ยืนยันสำเร็จและสร้าง Registration |
| CANCELLED | ยกเลิกก่อน Confirm |
| EXPIRED | หมดอายุก่อน Confirm |

สถานะ Payment ต้องแยกจาก Registration และ Check-in

### BR-PAY-007 — Payment History

ระบบต้องเก็บ Payment History แม้ Registration ถูกยกเลิก หรือ Event/Ticket Type ถูกลบภายหลัง

ข้อมูลขั้นต่ำ:

- Payment ID
- User
- Event ID และชื่อ Event Snapshot
- Ticket Type ID และชื่อ Ticket Snapshot
- Quantity
- Unit Price Snapshot
- Total Amount
- Payment Status
- Created At
- Expires At
- Confirmed At
- Registration ID (เมื่อมี)
- Issued Ticket Code (เมื่อมี)

ห้ามใช้ Payment History เป็นหลักฐานว่าตั๋วยังใช้งานได้ หลัง Registration ถูกยกเลิกแล้ว

## 4. API Contract

### API-PAY-001 — Checkout

`POST /api/payments/mock/checkout`

Authentication: Logged-in USER  
CSRF: Required

Request:

```json
{
  "eventId": 1,
  "ticketTypeId": 2,
  "quantity": 2
}
```

Expected HTTP: `201 Created`

Response:

```json
{
  "paymentId": 101,
  "status": "PENDING_PAYMENT",
  "eventId": 1,
  "ticketTypeId": 2,
  "quantity": 2,
  "unitPrice": 250.00,
  "totalAmount": 500.00,
  "currency": "THB",
  "qrPayload": "EVENTHUB_DEMO_PAYMENT:101",
  "expiresAt": "2026-10-13T17:10:00"
}
```

Acceptance Criteria:

- Validates Authentication
- Validates Event exists
- Validates Event has not started
- Validates Ticket Type belongs to Event
- Rejects Free Ticket
- Validates Quantity
- Validates Event / Ticket Type Capacity
- Rejects existing Registration
- Calculates price from database
- Creates Pending Payment
- Does not create Registration or Ticket Code
- Returns demo-only QR payload

### API-PAY-002 — Confirm

`POST /api/payments/mock/{paymentId}/confirm`

Authentication: Payment Owner  
CSRF: Required

Expected HTTP: `200 OK`

Response:

```json
{
  "paymentId": 101,
  "paymentStatus": "CONFIRMED",
  "registration": {
    "id": 55,
    "registeredAt": "2026-10-13T17:01:00",
    "quantity": 2,
    "ticketCode": "GTH-ABCDEFGHIJ",
    "ticketTypeName": "General",
    "totalPrice": 500.00,
    "event": {}
  }
}
```

หมายเหตุ: `registration` ต้องใช้โครงสร้าง `ApiDtos.RegistrationDto` จริงของ Backend โดยตัวอย่างด้านบนละรายละเอียดใน `event` ไว้เพื่อให้อ่านง่าย

Acceptance Criteria:

- Validates Authentication and Ownership
- Rejects Expired / Cancelled Payment
- Locks necessary database rows
- Verifies Event and Ticket Type still exist
- Verifies price has not changed
- Verifies Capacity again
- Prevents Duplicate Registration
- Creates Registration and Ticket Code
- Updates Payment to CONFIRMED
- Commits Payment and Registration atomically
- Repeated Confirm never issues another Ticket

### API-PAY-003 — Payment Status

`GET /api/payments/mock/{paymentId}`

Authentication: Payment Owner

Expected HTTP: `200 OK`

Response:

```json
{
  "paymentId": 101,
  "status": "CONFIRMED",
  "totalAmount": 500.00,
  "currency": "THB",
  "confirmedAt": "2026-10-13T17:01:00",
  "registrationId": 55
}
```

Acceptance Criteria:

- Owner can read their Payment
- Other Users cannot read it
- Missing Payment returns 404
- Payment History remains available
- Pending Payments past expiry must not appear confirmable

### API-PAY-004 — Cancel

`POST /api/payments/mock/{paymentId}/cancel`

Authentication: Payment Owner  
CSRF: Required

Expected HTTP: `200 OK`

Acceptance Criteria:

- Only Pending Payment may be cancelled
- Status becomes CANCELLED
- No Registration is created
- Payment History is retained
- Confirm after Cancel must be rejected
- No other Registration is affected

## 5. Unit Test Requirements

Suggested package:

`backend/src/test/java/com/eventhub/service/`

### Checkout Tests

| Test ID | Scenario | Expected |
|---|---|---|
| PAY-CHK-001 | Valid Paid Ticket | Pending created |
| PAY-CHK-002 | Free Ticket | Rejected |
| PAY-CHK-003 | Unauthenticated User | 401 |
| PAY-CHK-004 | Event missing | 404 |
| PAY-CHK-005 | Ticket not in Event | Rejected |
| PAY-CHK-006 | Quantity 0 or greater than 10 | 400 |
| PAY-CHK-007 | Event capacity exceeded | 409 |
| PAY-CHK-008 | Ticket capacity exceeded | 409 |
| PAY-CHK-009 | Existing Registration | 409 |
| PAY-CHK-010 | Valid Price Snapshot | Correct amount |
| PAY-CHK-011 | Pending Checkout | No Registration |
| PAY-CHK-012 | Pending Checkout | No Ticket Code |
| PAY-CHK-013 | Pending Checkout | No capacity reservation |

### Confirm Tests

| Test ID | Scenario | Expected |
|---|---|---|
| PAY-CFM-001 | Valid Confirm | Registration created |
| PAY-CFM-002 | Confirm twice | No duplicate Registration |
| PAY-CFM-003 | Different User | Access rejected |
| PAY-CFM-004 | Expired Payment | 409 |
| PAY-CFM-005 | Cancelled Payment | 409 |
| PAY-CFM-006 | Event started | 409 |
| PAY-CFM-007 | Event full | 409 |
| PAY-CFM-008 | Ticket Type full | 409 |
| PAY-CFM-009 | Price changed | 409 |
| PAY-CFM-010 | Ticket Type removed | Rejected |
| PAY-CFM-011 | Existing Registration | 409 |
| PAY-CFM-012 | Registration save fails | Transaction rollback |
| PAY-CFM-013 | Concurrent Confirm | One Registration |
| PAY-CFM-014 | Registration cancelled after Confirm | No ticket reissuance |

### Status and Cancellation Tests

| Test ID | Scenario | Expected |
|---|---|---|
| PAY-STS-001 | Owner gets Payment | 200 |
| PAY-STS-002 | Non-owner gets Payment | Access rejected |
| PAY-STS-003 | Payment not found | 404 |
| PAY-CAN-001 | Cancel Pending | CANCELLED |
| PAY-CAN-002 | Confirm cancelled Payment | 409 |
| PAY-CAN-003 | Cancel confirmed Payment | 409 |
| PAY-CAN-004 | Cancel Payment of another User | Access rejected |

### Registration Compatibility Tests

| Test ID | Scenario | Expected |
|---|---|---|
| PAY-REG-001 | Direct Free Ticket Registration | Success |
| PAY-REG-002 | Direct Paid Ticket Registration | Rejected |
| PAY-REG-003 | Confirm Paid Payment | Ticket generated |
| PAY-REG-004 | Cancel Registration after Confirm | Payment History retained |
| PAY-REG-005 | Existing Staff Check-in | Works with issued ticket |

## 6. Integration Test Requirements

Suggested package:

`backend/src/test/java/com/eventhub/integration/payment/`

Suggested Test Classes:

- `MockPaymentFlowIntegrationTests`
- `MockPaymentSecurityIntegrationTests`
- `MockPaymentConcurrencyIntegrationTests`

Use the existing `test` Spring Profile and an isolated H2 test database.

### INT-PAY-001 — Full Free Ticket Flow

1. Create Event and Free Ticket
2. Authenticate User
3. Register using existing Registration API
4. Verify Registration persisted
5. Verify Ticket Code generated
6. Verify no Payment Order required
7. Verify Staff Check-in succeeds

### INT-PAY-002 — Full Paid Ticket Flow

1. Create Event and Paid Ticket
2. Authenticate User
3. Call Checkout
4. Verify Pending Payment persisted
5. Verify Registration does not exist
6. Confirm Payment
7. Verify Payment CONFIRMED
8. Verify Registration persisted
9. Verify Ticket Code generated
10. Verify Staff Check-in succeeds

### INT-PAY-003 — Payment Persistence

Verify:

- Payment ID persists
- Price Snapshot persists
- Payment Status persists
- Registration ID is absent before Confirm
- Registration ID is present after Confirm
- Historical Payment remains after Registration Cancellation

### INT-PAY-004 — Transaction Rollback

Simulate a Registration persistence failure.

Verify:

- No committed CONFIRMED Payment without Registration
- No partial Registration persists
- No duplicate Ticket Code is issued

### INT-PAY-005 — Concurrency

Run real concurrent confirmation requests against a shared test database.

Verify:

- No Event overselling
- No Ticket Type overselling
- No duplicate Registration per User/Event
- Repeated confirmation of the same Payment creates at most one Registration

Concurrency tests must use appropriate synchronization and timeouts, not rely only on arbitrary `sleep()`.

### INT-PAY-006 — Authentication & CSRF

Verify:

- Guest cannot Checkout or Confirm
- Missing CSRF Token on POST is rejected
- Authenticated User with valid CSRF can access permitted operations
- User A cannot access User B's Payment
- Existing Security Rules remain effective

## 7. HTTP Error Contract

| Scenario | Expected Status |
|---|---|
| Checkout success | 201 |
| Confirm success | 200 |
| Get Payment success | 200 |
| Cancel Pending success | 200 |
| Authentication missing | 401 |
| Request validation failure | 400 |
| Ownership violation | 404 or 403, policy to be finalized |
| Event, Ticket or Payment missing | 404 |
| Capacity exceeded | 409 |
| Expired Payment | 409 |
| Cancelled Payment Confirm | 409 |
| Price changed | 409 |
| Duplicate Registration | 409 |

Use the existing `ApiExceptionHandler` format:

```json
{
  "message": "Human-readable error"
}
```

## 8. Rules Requiring Agreement Before Final Assertions

QA และ Backend ต้องยืนยันนโยบายต่อไปนี้ก่อนล็อก Assertions:

1. **Duplicate Pending Checkout:** เสนอให้มี Active Pending ได้ไม่เกินหนึ่งรายการต่อ User/Event; เมื่อ Pending เดิมยังไม่หมดอายุให้ตอบ 409 และเมื่อหมดอายุแล้วจึงสร้างรายการใหม่ได้
2. **Expired Status:** หากไม่มี Background Job การอ่าน Payment ที่หมดอายุควรแสดงสถานะ EXPIRED ตามเวลาจริง และการเปลี่ยนสถานะในฐานข้อมูลอาจเกิดแบบ Lazy ภายใน Write Transaction
3. **Already Confirmed Payment:** หาก Registration ยังมีอยู่ การ Confirm ซ้ำต้องคืนผลเดิมโดยไม่สร้างตั๋วซ้ำ
4. **Confirmed Payment After Registration Cancellation:** เสนอให้ตอบ 409 หรือผลลัพธ์ที่บ่งชี้ชัดว่าไม่สามารถใช้งานตั๋วเดิมได้ โดยห้ามสร้าง Registration ใหม่
5. **Deleted Event/Ticket:** Payment History ต้องอ่านได้จาก Snapshot แต่ไม่สามารถ Confirm Pending Payment ที่อ้างอิงข้อมูลซึ่งถูกลบไปแล้ว
6. **Ownership Failure:** เลือกใช้ 404 เพื่อไม่เปิดเผยการมีอยู่ของ Payment หรือ 403 ตาม Security Policy ของทีม
7. **Confirmed Payment Reconciliation:** หาก Registration ถูกลบภายหลัง ห้ามแสดง Ticket Code เก่าเป็นตั๋วที่ยังใช้งานได้

ห้ามสมมตินโยบายเหล่านี้เองหากกระทบผลการทดสอบ ให้ QA แจ้ง Backend เพื่อยืนยัน Contract ก่อน

## 9. Existing Tests and Regression

Existing Registration Tests อาจขัดกับกฎใหม่ โดยเฉพาะ Test ที่คาดหวังให้ Paid Ticket ลงทะเบียนโดยตรงได้

QA ต้อง:

- ระบุ Test ที่ได้รับผลกระทบ
- รักษา Coverage ของ Capacity, Authentication, Duplicate Registration และ Total Price
- ปรับ Test ให้ตรงกับ Business Rule ใหม่หลังตกลง Contract
- ไม่ลบ Tests เพื่อทำให้ Build ผ่าน
- ไม่ลด Assertion หรือใช้ `@Disabled` เพื่อปิดบัง Failure
- ตรวจว่าการลงทะเบียนบัตรฟรียังทำงานเหมือนเดิม

## 10. Test-first Workflow

### Phase A — Backend Skeleton

Backend เตรียม:

- `MockPaymentStatus`
- `MockPaymentOrder`
- `MockPaymentRepository`
- Mock Payment DTO
- `MockPaymentService` Skeleton
- `MockPaymentController`
- เอกสารฉบับนี้

Backend ต้อง Compile ผ่านก่อนส่งให้ QA

### Phase B — QA RED

QA แตก Branch จาก `feat/backend-mock-payment`

เขียน Tests ตาม Test IDs และ Acceptance Criteria

ต้องตรวจว่า:

- Test Code Compile ผ่าน
- Test Fixtures ถูกต้อง
- Test Fail เพราะ Behavior ยังไม่ได้ Implement
- Red Build ไม่ได้เกิดจาก Missing Dependencies หรือ Test Setup Error

เก็บ GitHub Actions URL ของ Failed Build

### Phase C — Backend GREEN

Backend Review Tests แล้ว Implement ทีละส่วน:

1. Checkout
2. Confirm and Registration
3. Payment Bypass Prevention
4. Status and Cancellation
5. Security / Transaction Safety
6. Regression Fixes

ห้ามเปลี่ยน Expected Results เพื่อหลบ Business Requirements

### Phase D — QA Verification

QA ตรวจ:

- Unit Tests
- Repository Integration Tests
- API / Security Integration Tests
- Full Free Ticket Flow
- Full Paid Ticket Flow
- Concurrent Confirm
- Existing Regression Tests

## 11. Definition of Done

- [ ] Free Ticket Registration works
- [ ] Paid Ticket requires Mock Payment
- [ ] Pending Payment does not create Registration
- [ ] Pending Payment does not generate Ticket Code
- [ ] Mock QR cannot be used to transfer real money
- [ ] Confirm generates Registration and Ticket Code
- [ ] Repeated Confirm does not issue duplicate Tickets
- [ ] Paid Ticket cannot bypass Payment
- [ ] Capacity is protected during concurrent requests
- [ ] Price Snapshot is enforced
- [ ] Payment History is preserved
- [ ] Ownership is enforced
- [ ] CSRF Protection remains enabled
- [ ] Staff Check-in works
- [ ] New Automated Tests pass
- [ ] Existing Regression Tests pass
- [ ] GitHub Actions RED and GREEN evidence exists
- [ ] Frontend receives the final API Contract

## 12. QA Deliverables

QA ต้องส่ง:

1. Test Coverage Matrix พร้อม Test IDs
2. รายชื่อ Test Files ที่สร้าง
3. Unit Test Results
4. Integration Test Results
5. Security Test Results
6. Concurrency Test Results
7. รายชื่อ Existing Tests ที่ต้องปรับ
8. GitHub Actions Red Build URL
9. QA Pull Request URL
10. ประเด็น Contract ที่ต้องให้ Backend ยืนยัน

**กฎสำคัญ:** QA เป็นเจ้าของ Test Code ส่วน Backend เป็นเจ้าของ Production Business Logic ห้ามแก้ Production Logic เพื่อสร้างผล Red แบบเทียม และห้ามแก้ Tests ให้ Green โดยลดข้อกำหนด
