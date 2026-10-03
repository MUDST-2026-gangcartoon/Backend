# ข้อกำหนดการทดสอบ Business Logic ของ EventService

> **ฉบับปรับปรุงสำหรับ Branch 7 — Staff Check-in**  
> ส่วนที่ 1–15 ด้านล่างเป็นข้อกำหนดของ Branch 6 ตามเอกสารเดิม ไม่ได้แปลว่า test ทุกข้อผ่านแล้วโดยอัตโนมัติ; ให้ดูผล CI ที่ merge เข้า `main` จริง  
> ส่วนที่ 16 เป็นต้นไปเป็นข้อกำหนด **งานใหม่** สำหรับ `feat/backend-staff` และต้องให้ QA เขียน test ก่อน Backend implement  
> เอกสารนี้เป็น specification/test contract ไม่ใช่รายงานผลทดสอบหรือหลักฐานว่า API ได้ deploy แล้ว

## 1. วัตถุประสงค์

เอกสารนี้กำหนดพฤติกรรมที่คาดหวังของ EventService สำหรับระบบ Event,
Ticket Type และ Registration ของ EventHub

ทีม Testing จะใช้เอกสารนี้ในการสร้าง Automated Tests ก่อนที่
Business Logic ของ EventService จะถูก implement ครบ

Test ต้องตรวจพฤติกรรมที่ระบบควรทำจาก Requirement
และไม่ควรผูกกับรายละเอียดภายในของ implementation โดยไม่จำเป็น

---

## 2. ขอบเขตการทดสอบ

EventServiceTests ในรอบนี้ครอบคลุม:

- การสร้าง Event
- การแก้ไข Event
- การลบ Event
- การจัดการ Ticket Type
- การลงทะเบียน / จองบัตร
- Event Capacity
- Ticket Type Capacity
- การป้องกันการลงทะเบียนซ้ำ
- การยกเลิก Registration
- การดู Registration ของ User ปัจจุบัน
- การตรวจ Authentication ที่ EventService ต้องใช้

ไม่อยู่ในขอบเขตรอบนี้:

- Staff Check-in (ไม่อยู่ใน Branch 6; กำหนดเพิ่มเติมในส่วนที่ 16 สำหรับ Branch 7)
- Upload
- Analytics
- Payment Gateway
- Frontend
- Kubernetes
- CI/CD implementation
- Monitoring
- End-to-End Browser Test

---

# 3. Domain ที่เกี่ยวข้อง

ระบบมี Model ที่เกี่ยวข้องดังนี้:

- UserAccount
- Event
- TicketType
- Registration
- Role

Role ของระบบ:

- USER
- STAFF
- ADMIN

Registration หนึ่งรายการหมายถึง User หนึ่งคน
ลงทะเบียน Event หนึ่งงาน และเลือก TicketType หนึ่งประเภท

Registration สามารถมี quantity มากกว่า 1 ได้

User หนึ่งคนต้องไม่สามารถมี Registration มากกว่า 1 รายการ
สำหรับ Event เดียวกัน

หนึ่ง Registration ใช้ Ticket Code หนึ่งรหัส
แม้ quantity จะมากกว่า 1

---

# 4. Repository Contract ที่มีอยู่แล้ว

Testing สามารถ Mock Repository ต่อไปนี้ได้

## EventRepository

มี operation สำคัญ:

- findById(...)
- findByIdForUpdate(...)
- search(...)
- countOpen(...)

`findByIdForUpdate(...)` เป็น Pessimistic Write Lock

Business operation ที่เกี่ยวกับ Capacity เช่น Register และ Update
ต้องใช้ locking operation ก่อนตรวจและแก้ข้อมูลที่เกี่ยวข้องกับ Capacity

---

## RegistrationRepository

มี operation สำคัญ:

- existsByUserIdAndEventId(...)
- seatsReservedByEventId(...)
- seatsReservedByTicketTypeId(...)
- findByUserIdOrderByEventStartsAtAsc(...)
- deleteByUserIdAndEventId(...)
- deleteByEventId(...)
- save(...)

การคำนวณที่นั่งต้องใช้ผลรวม quantity
ไม่ใช่นับจำนวน Registration row

---

## TicketTypeRepository

มี operation สำคัญ:

- findById(...)
- findByEventIdOrderByIdAsc(...)
- existsByEventId(...)
- summariesForEventIds(...)

---

## UserRepository

มี:

- findByEmail(...)

EventService ต้องหา User จาก email ของ authenticated principal
ไม่รับ userId จาก Client เพื่อทำรายการแทน User คนอื่น

---

# 5. Authentication Requirement

## EVT-AUTH-001 — ไม่มี Authentication

Given:
ไม่มี authenticated principal

When:
User เรียก operation ที่ต้องรู้ว่าเป็น User คนใด เช่น Register,
Cancel หรือ My Registrations

Then:
- operation ต้องถูกปฏิเสธเป็น Unauthorized
- ต้องไม่มีข้อมูลถูกบันทึกหรือลบ

---

## EVT-AUTH-002 — Principal มีแต่ User ไม่มีใน Database

Given:
มี authenticated principal
แต่ email ของ principal ไม่พบใน UserRepository

When:
เรียก operation ที่ต้องใช้ current user

Then:
- operation ต้องถูกปฏิเสธเป็น Not Found
- ต้องไม่มีข้อมูลถูกเปลี่ยนแปลง

---

# 6. Registration / Ticket Purchase

## EVT-REG-001 — ลงทะเบียนสำเร็จ

Given:

- User login แล้ว
- User มีอยู่ในฐานข้อมูล
- Event มีอยู่
- Event ยังไม่เริ่ม
- User ยังไม่เคยลงทะเบียน Event นี้
- TicketType มีอยู่
- TicketType เป็นของ Event ที่กำลังลงทะเบียน
- Event ยังมี Capacity เพียงพอ
- TicketType ยังมี Capacity เพียงพอ

When:

User ลงทะเบียนโดยระบุ TicketType และ quantity ที่ถูกต้อง

Then:

- Registration ต้องถูก save 1 รายการ
- Registration.user ต้องเป็น authenticated user
- Registration.event ต้องเป็น Event ที่เลือก
- Registration.ticketType ต้องเป็น TicketType ที่เลือก
- Registration.quantity ต้องเท่ากับ quantity ที่ส่งมา
- ticketCode ต้องถูกสร้าง
- ticketCode ต้องขึ้นต้นด้วย `GTH-`
- registeredAt ต้องถูกกำหนด
- Service ต้องคืน RegistrationDto ของรายการที่สร้าง

---

## EVT-REG-002 — Event ไม่มีอยู่

Given:
User login แล้ว

When:
ลงทะเบียน Event ID ที่ไม่มีอยู่

Then:
- ต้องถูกปฏิเสธเป็น Not Found
- RegistrationRepository.save(...) ต้องไม่ถูกเรียก

---

## EVT-REG-003 — Event เริ่มแล้ว

Given:

Event.startsAt เท่ากับหรือก่อนเวลาปัจจุบัน

When:
User พยายามลงทะเบียน

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- ต้องไม่มี Registration ใหม่

Expected message:

`Registration has closed`

---

## EVT-REG-004 — User ลงทะเบียน Event เดิมซ้ำ

Given:

User มี Registration ของ Event นี้อยู่แล้ว

When:

User พยายามลงทะเบียน Event เดิมอีกครั้ง

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- ต้องไม่มี Registration รายการที่สอง

Expected message:

`You are already registered`

Database unique constraint เป็นด่านป้องกันอีกชั้น
แต่ EventService ต้องป้องกันใน Business Logic ด้วย

---

## EVT-REG-005 — TicketType ไม่มีอยู่

Given:

Event มีอยู่
แต่ TicketType ID ไม่มีอยู่ในฐานข้อมูล

When:
User ลงทะเบียน

Then:

- ต้องถูกปฏิเสธเป็น Not Found
- ต้องไม่มี Registration ถูกสร้าง

---

## EVT-REG-006 — TicketType เป็นของ Event อื่น

Given:

- Event A มีอยู่
- Event B มีอยู่
- TicketType X เป็นของ Event B

When:

User ลงทะเบียน Event A แต่ส่ง TicketType X

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- ต้องไม่มี Registration ถูกสร้าง

Client ต้องไม่สามารถผสม Event ID กับ TicketType ID ของอีกงานได้

---

## EVT-REG-007 — Event Capacity ไม่พอ

ตัวอย่าง:

Event.capacity = 100

จำนวนที่นั่งที่ถูกจองแล้ว = 98

User ขอ quantity = 3

When:
User ลงทะเบียน

Then:

- 98 + 3 > 100
- ต้องถูกปฏิเสธเป็น Conflict
- Registration ต้องไม่ถูก save

การตรวจ Capacity ต้องใช้ผลรวม quantity
ไม่ใช่จำนวน Registration

---

## EVT-REG-008 — TicketType Capacity ไม่พอ

ตัวอย่าง:

TicketType.capacity = 20

จำนวนที่ขายไปแล้ว = 19

User ขอ quantity = 2

Then:

- 19 + 2 > 20
- ต้องถูกปฏิเสธเป็น Conflict
- Registration ต้องไม่ถูก save

ระบบต้องตรวจทั้ง:

1. Capacity รวมของ Event
2. Capacity ของ TicketType

---

## EVT-REG-009 — ต้อง Lock Event ก่อนตรวจ Capacity

When:
เริ่ม Registration operation

Then:

EventService ต้องโหลด Event ผ่าน:

`EventRepository.findByIdForUpdate(...)`

ก่อนตรวจ Capacity และก่อน Save Registration

Testing ต้อง verify ว่า locking repository method ถูกใช้งาน

เหตุผลคือป้องกัน User หลายคนซื้อที่นั่งสุดท้ายพร้อมกัน
จนเกิด Overselling

---

## EVT-REG-010 — Total Price

Given:

Ticket price = 250.00

quantity = 3

When:
สร้าง RegistrationDto

Then:

totalPrice ต้องเป็น:

750.00

ใน scope ปัจจุบัน Total Price คำนวณจาก
ราคาปัจจุบันของ TicketType × quantity

ระบบยังไม่มี Payment Gateway

ดังนั้น Test ต้องไม่สมมติว่าการสร้าง Registration
หมายถึงการชำระเงินจริงสำเร็จ

---

# 7. Create Event

## EVT-CREATE-001 — สร้าง Event สำเร็จ

Given:

EventRequest ถูกต้อง และมี TicketType ที่ถูกต้อง

When:

สร้าง Event

Then:

Event ต้องถูก save และ field ต่อไปนี้ต้องถูก map ถูกต้อง:

- title
- description
- location
- startsAt
- capacity
- category
- imageUrl
- detailImages
- ticketTypes

TicketType ทุกตัวต้อง reference กลับมายัง Event ที่สร้าง

---

## EVT-CREATE-002 — ผลรวม Ticket Capacity ต้องเท่ากับ Event Capacity

ตัวอย่าง:

Event.capacity = 100

TicketType:
- General = 60
- VIP = 40

ผลรวม = 100

→ ผ่าน

ตัวอย่างที่ไม่ผ่าน:

Event.capacity = 100

TicketType:
- General = 50
- VIP = 30

ผลรวม = 80

→ ต้อง Reject เป็น Conflict

EventService ต้องไม่บันทึก Event ที่ Ticket Plan
มี Capacity รวมไม่เท่ากับ Event Capacity

---

# 8. Update Event

## EVT-UPDATE-001 — แก้ Event สำเร็จ

Given:

Event มีอยู่
Request ถูกต้อง

When:

Update Event

Then:

ข้อมูล Event และ TicketType ที่รองรับการแก้ไข
ต้องถูก update ตาม Request

Update ที่เกี่ยวกับ Capacity ต้องโหลด Event ผ่าน
`findByIdForUpdate(...)`

---

## EVT-UPDATE-002 — Event ไม่มีอยู่

Given:

Event ID ไม่มีอยู่

When:

Update Event

Then:

- ต้องถูกปฏิเสธเป็น Not Found
- ต้องไม่สร้าง Event ใหม่แทน

---

## EVT-UPDATE-003 — ลด Event Capacity ต่ำกว่าที่ขายแล้วไม่ได้

ตัวอย่าง:

Event ขายไปแล้ว = 30 ที่นั่ง

Admin พยายามเปลี่ยน:

capacity = 20

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- Capacity เดิมต้องไม่ถูกทำให้ต่ำกว่าจำนวนที่ขายไปแล้ว

---

## EVT-UPDATE-004 — ลด TicketType Capacity ต่ำกว่าที่ขายแล้วไม่ได้

ตัวอย่าง:

VIP capacity เดิม = 20

ขาย VIP แล้ว = 15

Admin พยายามเปลี่ยน VIP capacity = 10

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- Registration เดิมต้องยัง valid

---

## EVT-UPDATE-005 — ห้ามลบ TicketType ที่ขายแล้ว

Given:

TicketType มี Registration ที่ซื้อ TicketType นี้อยู่แล้ว

When:

Update Event แล้วพยายามลบ TicketType นั้นออกจาก Ticket Plan

Then:

- ต้องถูกปฏิเสธเป็น Conflict
- TicketType ที่ขายแล้วต้องไม่หายจาก Event

---

## EVT-UPDATE-006 — TicketType ID ต้องเป็นของ Event นี้จริง

Given:

TicketType ID เป็นของ Event B

When:

ใช้ TicketType ID นั้นใน Update Request ของ Event A

Then:

ต้อง Reject

ห้ามนำ TicketType ของอีก Event มาผูกหรือสร้างซ้ำโดยไม่ตั้งใจ

---

## EVT-UPDATE-007 — ห้าม TicketType ID ซ้ำใน Request

Given:

Update Request ส่ง TicketType ID เดียวกันมากกว่า 1 ครั้ง

When:

Update Event

Then:

ต้อง Reject Request

เพื่อป้องกัน Ticket Plan ที่ไม่สอดคล้องกับ Capacity ที่ Validate

---

# 9. Delete Event

## EVT-DELETE-001 — ลบ Event สำเร็จ

Given:

Event มีอยู่

When:

Delete Event

Then:

ต้องลบ Registration ของ Event นั้นก่อน
แล้วจึงลบ Event

Testing ต้อง verify ลำดับ/interaction ที่จำเป็น:

1. delete registrations
2. delete event

TicketTypes และ DetailImages ที่ Event เป็นเจ้าของ
จะถูกจัดการตาม Entity mapping

---

## EVT-DELETE-002 — Event ไม่มีอยู่

Given:

Event ID ไม่มีอยู่

When:

Delete

Then:

- ต้องตอบ Not Found
- ต้องไม่เรียก delete operations

---

# 10. Cancel Registration

## EVT-CANCEL-001 — User ยกเลิก Registration ของตัวเอง

Given:

User A login แล้ว
User A มี Registration ของ Event A

When:

User A cancel Event A

Then:

ต้องลบเฉพาะ Registration ของ:

User A + Event A

Client ต้องไม่สามารถส่ง userId ของคนอื่นเพื่อยกเลิกแทนได้

---

## EVT-CANCEL-002 — ไม่มี Registration ให้ยกเลิก

Given:

User ยังไม่เคยลงทะเบียน Event นี้

When:

Cancel

Then:

ต้องตอบ Not Found

Expected message:

`Registration not found`

---

# 11. My Registrations

## EVT-MINE-001 — ดู Registration ของ User ปัจจุบัน

Given:

User login แล้วและมี Registration หลายรายการ

When:

เรียกดู My Registrations

Then:

- ต้องคืนเฉพาะ Registration ของ authenticated user
- ต้องใช้ ordering ตาม Event start time จาก Repository
- ต้องคืนเป็น RegistrationDto
- ต้องไม่คืน Entity ให้ Controller serialize โดยตรง

---

# 12. Validation ที่ไม่ควรเขียนซ้ำใน EventServiceTests

ข้อเหล่านี้ถูกตรวจใน DTO / Bean Validation layer:

PurchaseRequest.quantity:

- minimum = 1
- maximum = 10

TicketTypeRequest:

- name validation
- price validation
- decimal precision
- capacity minimum

EventRequest:

- required fields
- string length
- category format
- nested validation

ถ้า EventServiceTests เป็น Pure Unit Test
ไม่ควรคาดหวังว่า `@Valid` จะทำงานโดยอัตโนมัติ

Validation เหล่านี้ควรมี DTO/Controller validation tests แยก

---

# 13. แนวทางการเขียน EventServiceTests

ให้ใช้:

- JUnit 5
- Mockito / Mock Repository
- Pure service test เป็นหลัก
- ไม่ต้อง Start Spring Context สำหรับ Business Rule ทุก testcase

Testing ควร:

- Mock Repository dependency
- Arrange test data
- Call EventService public method
- Assert Result / Exception
- Verify Repository interaction เมื่อ interaction นั้นเป็นส่วนหนึ่งของ Requirement

ห้าม:

- Test private method โดยตรง
- เขียน Test อิง implementation detail ที่ Requirement ไม่ได้กำหนด
- Disable failing test เพื่อให้ Pipeline ผ่าน
- ลด assertion เพื่อให้ Test ผ่านง่ายขึ้น

ไฟล์หลัก:

`src/test/java/com/eventhub/service/EventServiceTests.java`

สามารถสร้าง Test Fixture / Helper เพิ่มใต้ `src/test` ได้

---

# 14. Test Priority

## P0 — ต้องทำใน Red Build รอบแรก

1. EVT-REG-001 Successful Registration
2. EVT-REG-002 Event Not Found
3. EVT-REG-003 Registration Closed
4. EVT-REG-004 Duplicate Registration
5. EVT-REG-005 TicketType Not Found
6. EVT-REG-006 TicketType Wrong Event
7. EVT-REG-007 Event Capacity Exceeded
8. EVT-REG-008 Ticket Capacity Exceeded
9. EVT-REG-009 Event Lock
10. EVT-CREATE-001 Create Event
11. EVT-CREATE-002 Ticket Capacity Sum
12. EVT-UPDATE-003 Cannot Reduce Event Capacity
13. EVT-CANCEL-001 Cancel Own Registration
14. EVT-CANCEL-002 Registration Not Found

## P1 — เพิ่มหลังจาก P0

- EVT-AUTH-001
- EVT-AUTH-002
- EVT-REG-010
- EVT-UPDATE-001
- EVT-UPDATE-002
- EVT-UPDATE-004
- EVT-UPDATE-005
- EVT-UPDATE-006
- EVT-UPDATE-007
- EVT-DELETE-001
- EVT-DELETE-002
- EVT-MINE-001

---

# 15. Definition of Done สำหรับ Testing

Testing phase นี้ถือว่าเสร็จเมื่อ:

- EventServiceTests ถูก commit โดยสมาชิก Testing
- Test compile กับ EventService Contract ได้
- Test ตรงกับ Requirement ในเอกสารนี้
- Pipeline แรกแสดง Test Failure เพราะ Business Logic ยัง implement ไม่ครบ
- ไม่มี Test ถูก @Disabled
- ไม่มีการลด Assertion เพื่อทำให้ build ผ่าน
- ใช้เฉพาะข้อมูล Test จำลอง
- ไม่มี Password/API Key/Token/ข้อมูลจริงอยู่ใน Test
- หลัง Backend implement เสร็จ Test ชุดเดิมต้องผ่าน


---

# 16. ส่วนเพิ่มเติมสำหรับ Branch 7 — Staff Check-in (ข้อกำหนดใหม่)

## 16.1 วัตถุประสงค์และขอบเขต

สร้างความสามารถฝั่ง Backend สำหรับให้ STAFF/ADMIN ดูรายชื่อผู้ลงทะเบียนของงาน เช็กอินด้วย Ticket Code และดูรายการเช็กอินล่าสุดของงาน โดยใช้ Registration ที่บันทึกจาก Branch 6 ไม่สร้างระบบชำระเงินจริงหรือการออกบัตรใหม่ใน Staff flow

ขอบเขต Branch 7: Service logic ของ `attendees(eventId)`, `checkIn(eventId,ticketCode)`, `recentCheckIns(eventId)` และ Automated Tests ที่เกี่ยวข้อง; **การเพิ่ม/เชื่อม HTTP Controller ตามแผนเดิมอยู่ Branch 8** หากทีมเปลี่ยนลำดับต้องบันทึกและตกลงร่วมกันก่อน การมี Service เพียงอย่างเดียวยังไม่ได้แปลว่า Frontend สามารถเรียก API เหล่านี้ได้แล้ว

ก่อน QA เขียน test ให้ Backend ตรวจ public contract, DTO, Entity และ Repository ใน `main` เวอร์ชันล่าสุด แล้ว commit **เฉพาะ signature/skeleton** ที่ตกลงกันลง Branch 7; อย่าสมมติว่า method ทั้งสามมีอยู่แล้วหรือเขียน Test ให้เกิดแค่ compile error

## 16.2 ข้อมูลและ contract ที่ QA/Backend ต้องตรวจให้ตรงกับโค้ดจริง

- `RegistrationRepository`: `findByEventIdOrderByRegisteredAtAsc(eventId)`, `findByTicketCode(ticketCode)`, `findTop8ByEventIdAndCheckedInAtIsNotNullOrderByCheckedInAtDesc(eventId)`; ตรวจ signature และ return type จริงก่อนเขียน mock
- `EventRepository`: `findById(eventId)` สำหรับตรวจ event ที่ร้องขอ
- `Registration`: `user`, `event`, `ticketType`, `quantity`, `registeredAt`, `ticketCode`, `checkedInAt` และกลไก `checkIn()` ที่ต้องตรวจจริงก่อนเลือก assert
- `ApiDtos.AttendeeDto`: `id` (ใน contract เดิมคือ **user id**), `name`, `email`, `registeredAt`, `ticketType`, `quantity`, `ticketCode`, `checkedInAt`
- `ApiDtos.CheckInRequest`: `ticketCode` (ไม่รับ `userId`/`role` จาก Client)
- `ApiDtos.CheckInDto`: `ticketCode`, `attendeeName`, `eventTitle`, `ticketType`, `quantity`, `checkedIn`, `checkedInAt`
- Code จากการลงทะเบียนมีหนึ่ง Code ต่อหนึ่ง Registration แม้ quantity มากกว่า 1; ไม่สมมติว่ามี Code แยกทุกที่นั่ง

## 16.3 P0 — Unit Tests ของ Service (QA เขียนก่อน implementation)

### EVT-STAFF-001 — ดูรายชื่อผู้ลงทะเบียนของงานที่มีอยู่

Given: Event A มีผู้ลงทะเบียนหลายรายการ แต่ละรายการมี User, TicketType, quantity และสถานะเช็กอินต่างกัน

When: เรียก `attendees(eventAId)`

Then: คืน `List<AttendeeDto>` เฉพาะงาน A ตามลำดับ `registeredAt` ที่ Repository จัดให้; แต่ละรายการมี user id/name/email, registeredAt, ชื่อ TicketType, quantity, ticketCode, checkedInAt ที่ตรงกับข้อมูลต้นทาง; ไม่ส่ง Entity หรือ password/hash ออกไป

### EVT-STAFF-002 — Event ไม่มีอยู่เมื่อขอรายชื่อ

When: เรียก `attendees(unknownEventId)`

Then: ตอบ Not Found (404); ไม่ส่งข้อมูลผู้ลงทะเบียนของ Event อื่น

### EVT-STAFF-003 — Check-in สำเร็จด้วย Ticket Code ของงานที่ร้องขอ

Given: มี Registration ของ Event A ที่ยังไม่เช็กอิน และมี Ticket Code ที่ตรงกัน

When: เรียก `checkIn(eventAId, code)`

Then: เช็กอิน Registration นั้นโดยกำหนด `checkedInAt` เมื่อเช็กอินครั้งแรก และคืน `CheckInDto` ซึ่งระบุ ticketCode, attendeeName, eventTitle, ticketType, quantity, checkedIn=true และ checkedInAt เดียวกับ Registration; ไม่สร้าง Registration ใหม่หรือเปลี่ยนจำนวนที่นั่ง

### EVT-STAFF-004 — ไม่พบ Ticket Code

When: เรียก `checkIn(eventAId, unknownCode)`

Then: ตอบ 404 และไม่มี Registration ใดเปลี่ยนสถานะ

### EVT-STAFF-005 — Ticket Code เป็นของ Event อื่น

Given: Ticket Code เป็นของ Event B แต่ Request ระบุ Event A

Then: ตอบ 409; ห้ามเช็กอินหรือเผยข้อมูลผู้เข้าร่วมของ Event B

### EVT-STAFF-006 — เช็กอินรหัสเดิมซ้ำตามลำดับ

Given: Registration มี checkedInAt อยู่แล้ว

When: เรียก checkIn อีกครั้งด้วย Code และ Event เดิม

Then: คืนสถานะสำเร็จ (HTTP contract ภายหลังคือ 200) พร้อม `checkedInAt` ค่าเดิม; ห้ามเปลี่ยน timestamp หรือนับว่าเป็นการเช็กอินคนใหม่ ทดสอบการเรียกซ้ำ **ตามลำดับ** เท่านั้น อย่าอ้างว่าพิสูจน์ concurrent exactly-once แล้ว

### EVT-STAFF-007 — Normalize Ticket Code

Given: Ticket Code ที่บันทึกมีรูป `GTH-...`

When: ส่ง code ที่มีช่องว่างหัวท้าย/ตัวพิมพ์เล็ก

Then: trim และแปลงเป็นตัวพิมพ์ใหญ่ก่อนค้นหา; คืนผลสำหรับ Registration เดียวกัน

### EVT-STAFF-008 — ดูรายการเช็กอินล่าสุด

Given: มีทั้ง Registration ที่เช็กอินแล้วและยังไม่เช็กอินสำหรับ Event A

When: เรียก `recentCheckIns(eventAId)`

Then: คืน `List<AttendeeDto>` เฉพาะรายการที่เช็กอินแล้ว สูงสุด 8 รายการ เรียง `checkedInAt` ล่าสุดก่อน; ไม่ปะปน Event B; คง quantity และเวลาจาก Registration จริง

## 16.4 P1 — API/Security & Edge Cases (ร่วมกับ Branch 8 หรือเมื่อ Controller พร้อม)

### EVT-STAFF-009 — สิทธิ์ HTTP ตาม Role

- Anonymous เรียก staff endpoints → 401
- USER เรียก staff endpoints → 403
- STAFF และ ADMIN เรียก staff endpoints ได้ ภายใต้ Spring Security Session/CSRF เดิม
- ไม่ใช้ `role` หรือ `userId` จาก request body เพื่อเพิ่มสิทธิ์
- ทดสอบ GET และ POST จริงบน HTTP layer ไม่ใช้ Unit Test ของ Service เพียงอย่างเดียวเป็นหลักฐาน Authorization

### EVT-STAFF-010 — คำขอ Check-in ไม่ถูกต้อง

`CheckInRequest.ticketCode` ว่าง/null/เกิน 32 ตัวอักษร → 400 ตาม DTO/HTTP validation; ตัว Service Unit Test ไม่ควรสมมติว่า `@Valid` รันเองโดยไม่มี Controller/Validator

### EVT-STAFF-011 — Recent Check-ins ของ Event ที่ไม่มีอยู่

คู่มือ render-v2 บันทึกพฤติกรรมเก่า `recentCheckIns(unknownId)` คืน `[]` ขณะที่ `attendees(unknownId)` คืน 404; **คงแนวทางนี้ชั่วคราวเพื่อเข้ากันกับคู่มือ** แต่ PM/QA/Frontend ต้องตกลงก่อนเขียน Test ว่าจะคง `200 []` หรือปรับให้สม่ำเสมอเป็น 404 แล้วบันทึก decision ในเอกสาร ไม่เขียน test สองแบบขัดกัน

### EVT-STAFF-012 — ความถูกต้องเมื่อมีการสแกนพร้อมกัน

Unit Test การสแกนซ้ำแบบ sequential **ไม่เพียงพอ** ที่จะอ้างว่าเช็กอินได้ครั้งเดียวภายใต้ concurrency ต้องกำหนดนโยบาย lock/atomic update หรือ optimistic version และทดสอบแบบ Integration บนฐานข้อมูลที่ใช้จริงก่อนกล่าวอ้าง exactly-once ห้ามสร้าง false-green จาก Mockito Test

### EVT-STAFF-013 — ความเป็นเอกลักษณ์ของ Ticket Code

ก่อนเปิดใช้จุดตรวจจริง ต้องตรวจว่ามี unique constraint/index ของ `ticketCode` ใน schema ปลายทาง และมีวิธีรับมือ code collision และข้อมูลเก่าที่ code เป็น null/ซ้ำ; การทดสอบ service แบบ mock เพียงอย่างเดียวพิสูจน์เรื่องนี้ไม่ได้ หากยังไม่มี ให้บันทึกเป็น Blocker/ข้อจำกัด ไม่อ้างว่าระบบปลอดภัยสมบูรณ์

### EVT-STAFF-014 — กฎการยกเลิก Registration หลัง Check-in

ระบบก่อนหน้าอาจยอมยกเลิกหลังเช็กอิน; PM ต้องยืนยันว่าจะอนุญาตหรือปฏิเสธก่อน QA สร้าง Test ใหม่สำหรับ `cancel()` อย่าคิดกฎเองหรือแก้ test Branch 6 โดยไม่มี change request

## 16.5 HTTP Contract สำหรับ Frontend (ใช้เมื่อ Controller ถูกสร้างและทดสอบแล้ว)

| Method | Route | สิทธิ์ | Request | Success |
| --- | --- | --- | --- | --- |
| GET | `/api/staff/events/{eventId}/attendees` | STAFF/ADMIN | ไม่มี body | 200 `AttendeeDto[]` |
| POST | `/api/staff/events/{eventId}/check-in` | STAFF/ADMIN | `{"ticketCode":"GTH-XXXXXXXXXX"}` | 200 `CheckInDto` |
| GET | `/api/staff/events/{eventId}/recent-check-ins` | STAFF/ADMIN | ไม่มี body | 200 `AttendeeDto[]` (สูงสุด 8) |
| GET | `/api/admin/events/{eventId}/attendees` | ADMIN | ไม่มี body | 200 `AttendeeDto[]` (อยู่ Branch 8 ตามแผน) |

Backend ใช้ Session Cookie + CSRF ของระบบเดิม; Frontend ต้องใช้ `credentials: 'include'` และแนบ `X-CSRF-TOKEN` ใน POST หลังขอ token ล่าสุด ห้ามสร้าง ticket code หรือเช็กอินจริงเฉพาะใน React state

## 16.6 วิธีส่งงาน Git/Test-first

1. หลัง PR Branch 6 ถูกรวมเข้า `main` และตรวจผล CI จริงแล้ว Backend แตก `feat/backend-staff` จาก `origin/main`; เพิ่มเอกสารนี้และ **Service Contract/Skeleton ที่ตกลงกับ QA เท่านั้น** และ push
2. QA แตก `test/backend-staff` จาก `origin/feat/backend-staff` สร้าง `src/test/java/com/eventhub/service/EventStaffServiceTests.java` หรือชื่อที่ทีมตกลง, เขียน P0 โดยไม่แก้ production logic, push เพื่อให้ CI ได้ Red Build ที่เกิดจาก assertion/behavior ไม่ใช่ compile error
3. QA เปิด PR `test/backend-staff` → `feat/backend-staff`; review และรวมบน GitHub ตาม branch policy (ไม่ต้อง local merge) ก่อน Backend implement
4. Backend implement ทีละ rule, commit/push เพื่อให้ CI ทดสอบซ้ำจน Green; QA review หลักฐานและเติม edge cases เมื่อพบช่องว่าง
5. เมื่อ `mvnw.cmd clean test` และ CI ผ่าน, QA/Backend review, PR `feat/backend-staff` → `main` และ merge บน GitHub

**อย่าใช้เอกสารนี้แทนผลตรวจ repository ล่าสุด:** ตรวจ method/constructor, package, DB mapping, workflow และ CI run จริงก่อนเริ่มทุก phase; หาก API ยังไม่มี Controller ให้บอก Frontend ว่ายังเป็น contract เป้าหมาย ไม่ใช่ endpoint ที่ใช้งานได้แล้ว
