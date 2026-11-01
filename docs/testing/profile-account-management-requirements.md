# ข้อกำหนดการทดสอบ Profile และ Password Management

**Project:** EventHub  
**Component:** Spring Boot Backend  
**Feature Branch:** `feat/backend-profile-account-management`  
**QA Branch:** `test/profile-account-management`  
**Development Approach:** Test First / Red → Green  
**Status:** Requirements for QA — Implementation Pending

---

## 1. วัตถุประสงค์

เพิ่ม API แก้ไขข้อมูลบัญชีของผู้ใช้ที่ Login แล้ว โดยรักษา User ID, Role และ Session Security ของระบบ EventHub เดิม

## 2. ขอบเขตการทดสอบ

### In Scope

- Profile Name/Email Update
- Current Password Validation
- Change Password
- Session Refresh และ CSRF Rotation
- Authentication/Role/Authorization

### Out of Scope

- Admin จัดการบัญชีของผู้อื่น
- Recovery ผ่าน Email จริง
- แก้ Role ด้วย Request จาก Client

## 3. Domain และ Repository Contract

- `UserAccount`: ID, Name, Email, Password Hash, Role
- `UserRepository.findForPasswordReset(email)`: Lock User ระหว่าง Update
- `PasswordEncoder.matches`: ตรวจ Current Password
- `SecurityContextRepository` และ `SessionAuthenticationStrategy`: เก็บ Session ใหม่
- `PasswordSessionGuard`: ตรวจ Session ที่ถือ Password Stamp เก่า (ต้องมีจากรอบ 01)

## 4. Business Rules

- USER, STAFF และ ADMIN แก้ได้เฉพาะบัญชีตัวเอง
- แก้ Profile ต้องยืนยัน Current Password
- Name มีความยาวหลัง Trim 2–100 ตัวอักษร; Email ต้อง Valid และยาวไม่เกิน 254 ตัวอักษร
- ระบบ Trim และ Lowercase Email
- ไม่อนุญาตเปลี่ยน Account ID หรือ Role ด้วย Request
- Password ใหม่ต้องไม่ซ้ำเดิม มีอย่างน้อย 8 ตัวอักษรและไม่เกิน 72 UTF-8 bytes
- หลังเปลี่ยนข้อมูล Session ปัจจุบันยังใช้งานได้; Session เก่าที่ถือ Identity/Password เดิมต้องถูกปฏิเสธ
- CSRF Token เดิมต้องถูกยกเลิกและ Client ขอ Token ใหม่

## 5. API Contract

### API-PROF-001 — Update Profile
`PUT /api/auth/profile` — Authenticated USER/STAFF/ADMIN, CSRF Required
```json
{"name":"Alice New","email":"NEW@example.test","currentPassword":"TestPassword123!"}
```
Success `200`: คืน UserDto มี id, name, email, role แต่ไม่มี Password Hash

### API-PROF-002 — Change Password
`POST /api/auth/password` — Authenticated USER/STAFF/ADMIN, CSRF Required
```json
{"currentPassword":"TestPassword123!","newPassword":"ChangedPassword456!"}
```
Success `200`: คืน UserDto; Session ปัจจุบันยังทำงานได้

## 6. Unit / Integration Test Requirements

## PROF-001 — แก้ Profile สำเร็จทุก Role [P0]

Given:
USER/STAFF/ADMIN Login ด้วยบัญชีของตนเอง

When:
PUT /api/auth/profile ด้วย Current Password ที่ถูกต้อง

Then:
- ได้ 200
- Name/Email ใหม่ถูกบันทึก
- ID และ Role ไม่เปลี่ยน

---

## PROF-002 — Normalize Email [P0]

Given:
Email ใน Request มี Space และตัวพิมพ์ใหญ่

When:
Update Profile

Then:
- Trim และ Lowercase ก่อนบันทึก

---

## PROF-003 — Current Password ผิด [P0]

Given:
User Login แล้ว

When:
ส่ง Current Password ผิดเพื่อเปลี่ยน Profile

Then:
- ได้ 400
- Name/Email เดิมคงอยู่

---

## PROF-004 — Email ซ้ำกับบัญชีอื่น [P0]

Given:
User B ใช้ Email เป้าหมายแล้ว

When:
User A เปลี่ยน Email เป็นของ B

Then:
- ได้ 409
- ไม่มีบัญชีใดถูกแก้

---

## PROF-005 — Email Invalid [P0]

Given:
User Login แล้ว

When:
ส่ง Email ว่าง รูปแบบผิด หรือเกิน 254 ตัวอักษร

Then:
- ได้ 400
- Email เดิมคงอยู่

---

## PROF-006 — Name Invalid [P1]

Given:
User Login แล้ว

When:
ส่ง Name ว่าง สั้นกว่า 2 หรือยาวเกิน 100 ตัวอักษร

Then:
- ได้ 400
- Name เดิมคงอยู่

---

## PROF-007 — คง ID/Role/Relations [P0]

Given:
User มี Registration เดิมและ Role USER

When:
ส่ง Role ADMIN เพิ่มใน JSON แล้วแก้ Name

Then:
- ID/Role ไม่เปลี่ยน
- Registration ยังอ้าง User ID เดิม

---

## PROF-008 — Change Password สำเร็จ [P0]

Given:
User Login แล้วและรู้ Current Password

When:
POST /api/auth/password ด้วย Password ใหม่

Then:
- ได้ 200
- บันทึก Password Hash ใหม่
- Login ด้วยรหัสเดิมไม่ได้; รหัสใหม่ Login ได้

---

## PROF-009 — Password ใหม่ไม่ผ่าน Validation [P0]

Given:
User Login แล้ว

When:
ส่ง Password ใหม่สั้น ซ้ำเดิม หรือเกิน 72 UTF-8 bytes

Then:
- ได้ 400
- Hash ใน Database ไม่เปลี่ยน

---

## PROF-010 — สอง Session หลังเปลี่ยน Password [P0]

Given:
บัญชีเดียวกัน Login ใน Session A/B

When:
เปลี่ยน Password ผ่าน A แล้ว GET /api/auth/me ทั้งสอง Session

Then:
- A ยังใช้งานได้
- B ถูกปฏิเสธ 401

---

## PROF-011 — สอง Session หลังเปลี่ยน Email [P0]

Given:
บัญชีเดียวกัน Login ใน Session A/B

When:
เปลี่ยน Email ผ่าน A แล้ว GET /api/auth/me ทั้งสอง Session

Then:
- A ใช้ Identity ใหม่ได้
- B ที่ยังถือ Email เดิมได้ 401

---

## PROF-012 — Authentication [P0]

Given:
ไม่มี Login Session

When:
PUT Profile หรือ POST Password

Then:
- ได้ 401
- ไม่มีข้อมูลถูกแก้

---

## PROF-013 — CSRF Protection [P0]

Given:
มี Login Session แต่ไม่มี CSRF

When:
PUT Profile หรือ POST Password

Then:
- ได้ 403
- ไม่มีข้อมูลถูกแก้

---

## PROF-014 — CSRF Rotation [P1]

Given:
Session A ถือ CSRF ก่อนอัปเดต Profile

When:
อัปเดต Profile สำเร็จแล้วใช้ Token เดิมทำ POST ถัดไป

Then:
- Token เดิมไม่ผ่าน
- GET /api/auth/csrf แล้วใช้ Token ใหม่ได้

---

## 7. Test Strategy

- Integration: `ProfileIT` ใช้ SpringBootTest, MockMvc, H2, JUnit 5 และ `MockPaymentDbTestSupport`
- ใช้ ParameterizedTest/EnumSource ครอบคลุม USER, STAFF, ADMIN
- ทดสอบ MockHttpSession สอง Session ที่แยกจากกันจริง
- ตรวจ UserRepository/PasswordEncoder หลัง Update และ Response ที่ไม่มี Password Hash
- เพิ่ม Test ยืนยัน CSRF Rotation แทนการใช้ `.with(csrf())` อย่างเดียว

## 8. Test-first Workflow

### Phase A — Backend Skeleton

Backend Commit แรกใน `feat/backend-profile-account-management` ต้องมีเอกสารฉบับนี้และ Compile-ready Skeleton ของ API/Service ที่กำลังเพิ่ม โดย Business Logic ที่ยังไม่เสร็จให้ Throw `UnsupportedOperationException` หรือคงสภาพ Stub อย่างชัดเจน ห้ามนำ Implementation ฉบับ Green มาปะปนในขั้นนี้

### Phase B — QA RED

QA แตก `test/profile-account-management` จาก Backend Commit แรก เขียน Tests ตาม Requirement ID แล้วรัน RED ก่อน Backend เติม Business Logic ให้แนบ Compiler/Assertion Log จริง และแยก `COMPILE_RED` ออกจาก `ASSERTION_RED`

### Phase C — Backend GREEN

Backend รับ Tests ของ QA กลับเข้า Feature Branch แล้วเติม Business Logic โดยไม่ลด Assertion หรือปิด Test จากนั้นรัน `mvnw clean verify` ให้ผ่าน

### Phase D — QA Verification

QA ดึง Implementation ล่าสุดมาทดสอบซ้ำ เก็บผล Test/Regression และอ้าง Commit SHA/CI Run จริงก่อนยืนยันพร้อม Merge

## 9. Definition of Done

- Profile/Password APIs ไม่แก้ Role หรือ Account ID
- Anonymous และ Request ที่ไม่มี CSRF ถูกปฏิเสธ
- Session ปัจจุบันใช้ต่อได้และ Session เก่าถูกปฏิเสธตาม Requirement
- QA ยืนยัน RED/GREEN พร้อม Result และ Regression Suite