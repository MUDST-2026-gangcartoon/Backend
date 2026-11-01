# ข้อกำหนดการทดสอบ Booking Lifecycle, Online Tickets และ Check-in Reporting

**Project:** EventHub  
**Component:** Spring Boot Backend  
**Feature Branch:** `feat/backend-booking-online-reporting`  
**QA Branch:** `test/booking-online-reporting`  
**Development Approach:** Test First / Red → Green  
**Status:** Requirements for QA — Implementation Pending

---

## 1. วัตถุประสงค์

กำหนดพฤติกรรมใหม่ของ EventService, MockPaymentService, Registration และ Online Event โดยต่อยอดจาก EventService และ Mock Payment Requirements เดิม ไม่เปลี่ยน Business Rule ที่ไม่เกี่ยวข้อง

## 2. ขอบเขตการทดสอบ

### In Scope

- Event Status / Schedule Timezone
- Free/Paid Booking และ Capacity
- Cancel Registration แบบเก็บประวัติ
- Mock Payment History, Resume และ Idempotency
- Online Event Access/Join และ Check-in Source
- Event Reporting และ Legacy Data Upgrade

### Out of Scope

- Payment Gateway / Refund เงินจริง
- Frontend E2E
- การ Migration Production Database โดยอัตโนมัติ

## 3. Domain และ Repository Contract

- `Event`: startsAt, endsAt, registrationClosesAt, checkinOpensAt, checkinClosesAt, eventFormat และ onlineMeetingUrl
- `TicketType`: price, capacity และ salesEnabled (null ของข้อมูลเก่าถือว่าเปิดขาย)
- `Registration`: quantity, ticketCode, status, cancelledAt, purchasedUnitPrice, purchasedTicketName, checkedInAt, checkinSource
- `MockPaymentOrder`: PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED และ Purchase Snapshot
- `EventRepository.findByIdForUpdate` และ `RegistrationRepository.activeForUpdate`: Lock ก่อนทำรายการที่อาจแข่งกัน
- `RegistrationRepository.seatsReservedByEventId` / `seatsReservedByTicketTypeId`: รวม quantity ของ Registration ที่ Active

## 4. Business Rules

- เวลาธุรกิจใช้ `Asia/Bangkok`; Event ที่ไม่มี endsAt ให้ default เป็น startsAt + 4 ชั่วโมง
- สถานะเรียงลำดับ ENDED, ONGOING, CLOSED, FULL, OPEN ตามเวลาหรือ Capacity
- เมื่อถึง registrationClosesAt พอดีจะจองไม่ได้
- บัตรฟรีจองผ่าน Registration API เดิม; บัตรราคา > 0 ต้องใช้ Mock Payment
- ยกเลิก Registration ได้ก่อน Check-in แม้งานจบแล้ว โดยไม่ Refund และต้องเก็บประวัติ
- คำนวณ Capacity/Participants ตาม quantity ของ Registration ที่ Active
- Confirm Payment ซ้ำไม่สร้าง Registration หรือ Ticket Code ใหม่
- Public Response ห้ามเปิดเผย onlineMeetingUrl; เปิด URL เฉพาะ USER ที่มี Active Registration ผ่าน Online Join
- Report แยก Orders กับ Participants และ Check-in Source STAFF/ONLINE/UNKNOWN
- Schema ของ Production ต้องมี Migration สำหรับ Database Dialect จริง; H2 Test ไม่ใช่หลักฐานของ Production

## 5. API Contract

### API-BOOK-001 — Registration
`POST /api/events/{eventId}/registrations` — USER; Direct API รับเฉพาะ Free Ticket

### API-BOOK-002 — Cancel Registration
`DELETE /api/events/{eventId}/registrations` — USER; Success `204`  
`POST /api/events/{eventId}/registrations/cancel` — USER + CSRF; Request `{"reason":"เปลี่ยนแผน"}`

### API-BOOK-003 — Mock Payment History / Resume
`GET /api/payments/mock/history?page=0&status=ALL` — USER เฉพาะประวัติของตัวเอง  
`GET /api/payments/mock/{id}/resume` — USER ผู้เป็นเจ้าของ; Pending ที่ไม่หมดอายุเท่านั้น

### API-BOOK-004 — Online Event
`GET /api/admin/events/{id}/online-settings` — ADMIN  
`GET /api/events/{id}/online-access` — USER มี Active Ticket; ไม่เปิดเผย URL  
`POST /api/events/{id}/online-join` — USER มี Active Ticket + CSRF; เปิดเผย URL หลังตรวจเวลา

### API-BOOK-005 — Reports
`GET /api/admin/events/{id}/report` และ `GET /api/admin/analytics/operations` — ADMIN

## 6. Unit / Integration Test Requirements

## BOOK-001 — ใช้เวลา Asia/Bangkok [P0]

Given:
เครื่อง Test/Runner ใช้ UTC

When:
คำนวณ EventClock.now และ Event Status

Then:
- ได้วัน/เวลาตาม Asia/Bangkok

---

## BOOK-002 — ตรวจ Event Schedule [P1]

Given:
กำหนด StartsAt, EndsAt, RegistrationClosesAt และ Check-in Window

When:
สร้างหรือแก้ Event ด้วยเวลา Invalid

Then:
- ส่ง 400 พร้อม field errors
- ไม่บันทึก Schedule ผิด

---

## BOOK-003 — Event Status Boundary [P0]

Given:
Event กำหนดช่วงรับสมัครและ Capacity แล้ว

When:
คำนวณที่เวลาปิดรับสมัคร เวลาเริ่ม และเวลาสิ้นสุดพอดี

Then:
- CLOSED, ONGOING และ ENDED ตาม Boundary
- FULL เมื่อ Capacity ถูกจองครบก่อนปิด

---

## BOOK-004 — Direct Free Registration [P0]

Given:
USER เลือกบัตรราคา 0 และยังมีที่นั่ง

When:
เรียก Registration API

Then:
- สร้าง Registration/Ticket Code
- ไม่สร้าง Payment Order

---

## BOOK-005 — Paid Ticket Bypass [P0]

Given:
USER เลือกบัตรราคา > 0

When:
เรียก Direct Registration API

Then:
- ได้ 409
- ไม่สร้าง Registration

---

## BOOK-006 — Capacity จาก Quantity [P0]

Given:
Event/TicketType เหลือ 2 ที่นั่ง

When:
USER ขอ Quantity 3

Then:
- ถูกปฏิเสธ 409
- ไม่มี Overselling

---

## BOOK-007 — Pending Checkout ไม่จองที่นั่ง [P0]

Given:
USER Checkout บัตรมีราคาและยังเปิดรับ

When:
POST Payment Checkout

Then:
- Payment PENDING_PAYMENT อายุ 10 นาที
- ยังไม่สร้าง Registration/ลด Capacity

---

## BOOK-008 — Confirm และ Idempotency [P0]

Given:
มี Pending Payment ที่ยัง Valid

When:
Confirm สองครั้ง

Then:
- สร้าง Registration/Ticket Code หนึ่งครั้ง
- ครั้งที่สองคืนผลเดิม

---

## BOOK-009 — Payment Ownership [P0]

Given:
Payment ของ USER A มีอยู่

When:
USER B อ่าน Status, History หรือ Resume ของ A

Then:
- ไม่เปิดเผย Payment ของ A
- การอ่าน Payment ID ที่ไม่ใช่เจ้าของตอบ 404

---

## BOOK-010 — Expired / Cancelled Payment [P0]

Given:
Payment หมดอายุหรือถูก Cancel แล้ว

When:
พยายาม Confirm/Resume

Then:
- ถูกปฏิเสธ 409
- ไม่มี Registration ใหม่

---

## BOOK-011 — Cancellation ก่อน Check-in [P0]

Given:
Active Registration ยังไม่เช็กอิน

When:
USER ยกเลิกหลัง Registration Deadline หรือหลัง Event จบ

Then:
- ยกเลิกได้
- เก็บ Status CANCELLED/Reason/Time
- คืน Capacity

---

## BOOK-012 — ห้าม Cancel หลัง Check-in [P0]

Given:
Registration มี checkedInAt

When:
USER พยายามยกเลิก

Then:
- ได้ 409
- Registration ยังคง Active

---

## BOOK-013 — Paid Cancellation / History [P0]

Given:
Payment CONFIRMED และ Registration ยังไม่เช็กอิน

When:
USER ยกเลิก Registration แล้ว Confirm Payment เดิมซ้ำ

Then:
- Payment ยังคง CONFIRMED ไม่มี Refund
- ไม่ออก Ticket ใหม่

---

## BOOK-014 — Rebooking หลัง Cancel [P0]

Given:
USER ยกเลิก Registration เดิม

When:
USER จอง Event เดิมอีกครั้ง

Then:
- มี Registration row ใหม่และ Ticket Code ใหม่
- Row เก่ายังคงอยู่ในประวัติ

---

## BOOK-015 — Staff Check-in [P0]

Given:
Staff มี Ticket Code ของ Event ที่ถูกต้อง

When:
Check-in ครั้งแรกและครั้งที่สอง

Then:
- ครั้งแรกบันทึก checkedInAt กับ STAFF
- ครั้งที่สอง ALREADY_USED ไม่เขียนทับ

---

## BOOK-016 — Online Meeting URL ไม่รั่ว [P0]

Given:
Event ONLINE มี Meeting URL

When:
เรียก Public Event List/Detail และ Online Access

Then:
- Response ไม่มี Meeting URL

---

## BOOK-017 — Online Access Rights [P0]

Given:
Guest/STAFF/USER ที่ไม่มี Active Ticket

When:
เรียก Online Access หรือ Join

Then:
- ถูกปฏิเสธตาม Authentication/Authorization
- Pending Payment อย่างเดียวไม่ให้เข้า

---

## BOOK-018 — Online Join / Time Window [P0]

Given:
USER มี Active Ticket และ Event ONLINE

When:
POST Online Join ก่อนเริ่ม ระหว่างงาน และหลังจบ

Then:
- ก่อน/หลังช่วงเวลาถูกปฏิเสธ
- ระหว่างงานคืน URL และ Check-in
- เรียกซ้ำไม่เปลี่ยน Check-in Time

---

## BOOK-019 — Concurrent Check-in / Cancel [P0]

Given:
สอง Request เข้าถึง Registration เดียวกันพร้อมกัน

When:
ทำ Online Join และ Cancel แข่งกัน

Then:
- ต้องไม่สำเร็จทั้งสองฝั่งจนเกิด State ขัดแย้ง

---

## BOOK-020 — Reporting Quantity และ Source [P0]

Given:
มี Active/Cancelled Registration หลายรายการและหลาย Quantity

When:
ADMIN เรียก Event Report และ Global Report

Then:
- Orders นับ Rows
- Participants/Check-in นับ Quantity
- แยก STAFF/ONLINE/UNKNOWN และไม่นับ Cancelled

---

## BOOK-021 — Legacy Schema Upgrade [P1]

Given:
มีข้อมูล Registration ใน H2 Schema เดิม

When:
เริ่มระบบด้วย BookingDataUpgrade

Then:
- ID/ข้อมูลเดิมไม่หาย
- ยกเลิกแล้วจองใหม่ได้ตาม Active Unique Constraint

---

## 7. Test Strategy

- Unit: `EventClockTests`, `EventRulesTests`, `EventServiceTests`, `EventStaffServiceTests`
- HTTP: `StaffControllerHttpTests`
- Integration: `AuditFixesIT`, `BookingRulesIT`, `CheckinSourceIT`, `MockPaymentFlowIT`, `OnlineTicketsIT`, `BookingSchemaUpgradeIT`
- Shared Fixture: `MockPaymentDbTestSupport` (ใช้เวอร์ชันสำหรับ Schedule Fields)
- ตรวจ Lock/Concurrency กับ Database/Transaction จริง และแยกผล H2 ออกจาก Production Migration

## 8. Test-first Workflow

### Phase A — Backend Skeleton

Backend Commit แรกใน `feat/backend-booking-online-reporting` ต้องมีเอกสารฉบับนี้และ Compile-ready Skeleton ของ API/Service ที่กำลังเพิ่ม โดย Business Logic ที่ยังไม่เสร็จให้ Throw `UnsupportedOperationException` หรือคงสภาพ Stub อย่างชัดเจน ห้ามนำ Implementation ฉบับ Green มาปะปนในขั้นนี้

### Phase B — QA RED

QA แตก `test/booking-online-reporting` จาก Backend Commit แรก เขียน Tests ตาม Requirement ID แล้วรัน RED ก่อน Backend เติม Business Logic ให้แนบ Compiler/Assertion Log จริง และแยก `COMPILE_RED` ออกจาก `ASSERTION_RED`

### Phase C — Backend GREEN

Backend รับ Tests ของ QA กลับเข้า Feature Branch แล้วเติม Business Logic โดยไม่ลด Assertion หรือปิด Test จากนั้นรัน `mvnw clean verify` ให้ผ่าน

### Phase D — QA Verification

QA ดึง Implementation ล่าสุดมาทดสอบซ้ำ เก็บผล Test/Regression และอ้าง Commit SHA/CI Run จริงก่อนยืนยันพร้อม Merge

## 9. Definition of Done

- Full Regression Test ผ่าน โดยรักษา Registration/Mock Payment/Staff Tests เดิม
- ยกเลิกแล้วจองใหม่ได้และ Payment History ไม่ถูกลบ
- Meeting URL ไม่หลุดจาก Public API
- Report นับจำนวนรายการกับจำนวนคนถูกต้อง
- มีหลักฐาน Upgrade H2 และเอกสารแผน Migration สำหรับฐานชนิดจริง