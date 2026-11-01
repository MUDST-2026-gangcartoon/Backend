# Test Cases — รอบ 02: Booking Lifecycle, Online Tickets และ Reporting

## Test class ที่อยู่ใน payload

| Test class | ประเภท | จุดที่ตรวจ |
| --- | --- | --- |
| `EventClockTests` | Unit | ใช้เวลา Asia/Bangkok แม้เครื่องทดสอบตั้งเป็น UTC |
| `EventRulesTests` | Unit | Event status ที่ boundary, schedule validation และ default ของข้อมูลเก่า |
| `EventServiceTests` | Unit | register, duplicate, event/ticket not found, ticket belongs to another event, capacity, lock, create/update capacity |
| `EventStaffServiceTests` | Unit | attendee list, unknown/wrong-event ticket, check-in, duplicate scan, normalize ticket code, recent check-ins |
| `StaffControllerHttpTests` | HTTP | Anonymous/USER/STAFF/ADMIN authorization, CSRF, request validation และการเรียก service |
| `BookingSchemaUpgradeIT` | Integration | เริ่มจาก legacy H2 schema, รักษาข้อมูลเดิม และยกเลิกแล้วจองใหม่ได้ |
| `AuditFixesIT` | Integration | pending paid/free conflict, deletion metadata, organizer fields และ malformed query parameters |
| `BookingRulesIT` | Integration | paid/free cancellation, history, seats, booking deadline, check-in window, ownership, concurrency และ report totals |
| `CheckinSourceIT` | Integration | STAFF/ONLINE/UNKNOWN source, duplicate scan และ source counts ใน report |
| `MockPaymentFlowIT` | Integration | free registration, paid checkout/confirm และ payment history หลัง cancellation |
| `OnlineTicketsIT` | Integration | URL validation/privacy, admin settings, active ticket, role/CSRF, event window, sales flag และ concurrency |

## Scenario ที่ต้องตรวจใน Test Review

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| BOOK-001 | EventClock / Bangkok time | เวลาและ status ไม่เปลี่ยนตาม timezone ของ Runner |
| BOOK-002 | Schedule boundary | start/end/registration close/check-in open-close ที่ boundary ให้ status และ validation ถูกต้อง |
| BOOK-003 | Free booking | USER จองบัตรฟรีได้; STAFF/ADMIN และ paid ticket ใช้ direct registration ไม่ได้ |
| BOOK-004 | Capacity | Event/Ticket capacity คิดจากผลรวม quantity; เกินแล้ว 409 |
| BOOK-005 | Paid checkout | checkout สร้าง pending payment อายุ 10 นาที แต่ยังไม่ reserve seat |
| BOOK-006 | Payment ownership | ผู้ใช้เห็น/จัดการได้เฉพาะ payment ของตัวเอง; payment ของคนอื่นไม่เปิดเผย |
| BOOK-007 | Payment confirmation | pending ที่ยังไม่หมดอายุและราคา/seat ยังถูกต้องจึง confirm ได้ |
| BOOK-008 | Confirm idempotency | confirm ซ้ำไม่สร้าง registration หรือ ticket code เพิ่ม |
| BOOK-009 | Payment expiry/cancel/resume | expired/cancelled ใช้ confirm ไม่ได้; resume คืน order เดิมเท่านั้น |
| BOOK-010 | Registration cancellation | ก่อน check-in ยกเลิกได้แม้เลย deadline/event end; หลัง check-in ยกเลิกไม่ได้ |
| BOOK-011 | Cancellation history | ยกเลิกแล้วเก็บ record/payment history, คืน seat และจองใหม่ได้ด้วย ticket code ใหม่ |
| BOOK-012 | Paid cancellation | ไม่คืนเงิน; payment ยังคง CONFIRMED และไม่ออก ticket ใหม่ |
| BOOK-013 | Event/Ticket deletion | มี registration/payment history แล้วลบไม่ได้ |
| BOOK-014 | Staff check-in | ตรวจ role, CSRF, code, event ownership, check-in window และ duplicate scan |
| BOOK-015 | Check-in source | source เป็น STAFF/ONLINE/UNKNOWN ตามหลักฐาน; scan ซ้ำไม่ overwrite |
| BOOK-016 | Online access | ต้องเป็น USER ที่มี active ticket; pending payment อย่างเดียวเข้าไม่ได้ |
| BOOK-017 | Online URL privacy | public event/access response ไม่มี meeting URL; admin settings อ่านได้เฉพาะ ADMIN |
| BOOK-018 | Online join | ใช้ได้เฉพาะ ONLINE ในช่วงกิจกรรม; join ซ้ำไม่สร้าง check-in ซ้ำ |
| BOOK-019 | Concurrent actions | concurrent check-in หรือ online join/cancel ต้องไม่ทำให้เกิดผลสำเร็จซ้ำ/ขัดกัน |
| BOOK-020 | Reports | แยกจำนวน order กับ quantity; ไม่นับ cancelled/unchecked ใน check-in source totals |
| BOOK-021 | Legacy schema | H2 legacy upgrade รักษา ID/record และสร้างความสามารถจองใหม่หลัง cancel |

## ขอบเขตที่ไม่ควรสรุปเกินหลักฐาน

- `BookingSchemaUpgradeIT` ยืนยันการ upgrade บน H2 เท่านั้น ไม่ได้ยืนยัน migration ของ Production database
- Test ของ MockMvc เป็น Backend HTTP Integration Test ไม่ใช่ Browser E2E ที่คลิกผ่าน React UI
- `prepare-dev-data.ps1` เป็น manual dev utility ไม่ได้ถูกรันใน `mvnw verify`
- Concurrency test บน H2 ไม่ได้แทนการทดสอบ lock behavior บน Production database engine
- การทดสอบ Online Event ผ่าน API ไม่ได้ยืนยันว่า external meeting provider ใช้งานได้จริง