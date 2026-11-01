# ข้อกำหนดการทดสอบ Mock Recovery และ Session Security

**Project:** EventHub  
**Component:** Spring Boot Backend  
**Feature Branch:** `feat/backend-identity-recovery-security`  
**QA Branch:** `test/identity-recovery-security`  
**Development Approach:** Test First / Red → Green  
**Status:** Requirements for QA — Implementation Pending

---

## 1. วัตถุประสงค์

กำหนดพฤติกรรมของ Mock Password Recovery ในสภาพแวดล้อม dev/test และการป้องกัน HTTP Session เก่าหลัง Password ของบัญชีเปลี่ยน Team QA ใช้ข้อกำหนดนี้เขียน Tests ก่อน Backend เติม Business Logic

## 2. ขอบเขตการทดสอบ

### In Scope

- Recovery Config, Request Token, Reset Password
- Token ที่ผูกกับ Session, Expiration, Single Use, Cooldown
- Password Hash, Login ด้วยรหัสใหม่ และการหมดสิทธิ์ของ Session เก่า
- HTTP Validation, CSRF และการจำกัด Spring Profile

### Out of Scope

- SMTP / Email Gateway จริง
- Production Password Recovery
- React UI, Browser E2E

## 3. Domain และ Repository Contract

- `UserAccount`: Email, Password Hash และ Role
- `UserRepository.findByEmail(email)`: ค้นหาบัญชี
- `UserRepository.findForPasswordReset(email)`: ใช้ Pessimistic Write Lock เมื่อ Reset
- `PasswordEncoder`: ตรวจรหัสผ่านเดิมและเข้ารหัสรหัสใหม่
- `AuthController`: เก็บ `AUTH_PASSWORD_STAMP` ใน Session หลัง Login/Signup
- `PasswordSessionGuard`: ตรวจ Password Stamp ใน Session เทียบกับ Hash ล่าสุด

## 4. Business Rules

- Mock Recovery ทำงานเฉพาะ `dev`, `e2e`, `test` และต้องไม่ทำงานเมื่อมี `prod` ร่วมด้วย
- Request/Reset เป็น Public HTTP API แต่คำขอ POST ต้องมี CSRF Token
- Token อายุ 15 นาที ผูกกับ Session เดิม ใช้ครั้งเดียว และขอซ้ำได้เมื่อผ่าน 30 วินาที
- Password ใหม่ต้องมีอย่างน้อย 8 ตัวอักษรและไม่เกิน 72 UTF-8 bytes
- หลัง Reset สำเร็จ Password เดิม Login ไม่ได้; Session ที่ใช้ Reset ต้องสิ้นสุด
- Session ที่ Login ค้างไว้ก่อนเปลี่ยน Password ต้องไม่สามารถใช้ API ต่อได้
- Mock Response ของกรณี Email ที่มีและไม่มีบัญชีมีข้อความต่างกัน จึงไม่ใช่ระบบ Password Recovery สำหรับ Production

## 5. API Contract

### API-REC-001 — Config
`GET /api/auth/recovery/config` — Public, Success `200`:
```json
{"mock":true,"expiresInMinutes":15}
```

### API-REC-002 — Request
`POST /api/auth/recovery/request` — Public, CSRF Required:
```json
{"email":"alice@example.test"}
```
Success `200`, Cooldown `429`; เมื่อมีบัญชีคืน `resetToken` กับ `expiresAt` สำหรับ Mock UI

### API-REC-003 — Reset
`POST /api/auth/recovery/reset` — Session เดิม, CSRF Required:
```json
{"token":"example-mock-token","password":"NewPassword456!"}
```
Success `200`, Invalid Token/Password `400`

## 6. Unit / Integration Test Requirements

## REC-001 — อ่าน Recovery Config [P0]

Given:
เปิดระบบด้วย Profile test

When:
เรียก GET /api/auth/recovery/config

Then:
- ได้ 200 และ mock=true
- expiresInMinutes=15

---

## REC-002 — ขอ Token สำเร็จ [P0]

Given:
มี alice@example.test ใน UserRepository

When:
POST /api/auth/recovery/request พร้อม Email และ CSRF

Then:
- ได้ 200 และ Reset Token ใน Session
- มี expiresAt; Password ยังไม่เปลี่ยน

---

## REC-003 — ห้ามใช้ Token ข้าม Session [P0]

Given:
Session A ขอ Token แล้ว

When:
นำ Token ไป Reset ใน Session B

Then:
- Session B ได้ 400
- Password เดิมอยู่ครบ และ Token A ยัง Valid

---

## REC-004 — Token ใช้ได้ครั้งเดียว [P0]

Given:
Session A มี Token ที่ Valid

When:
Reset สำเร็จ แล้วส่ง Token เดิมซ้ำ

Then:
- ครั้งแรก 200
- ครั้งหลังถูกปฏิเสธและไม่เปลี่ยน Password ซ้ำ

---

## REC-005 — Rate Limit การขอ Token [P0]

Given:
Session เดิมเพิ่งขอ Token

When:
ขออีกครั้งก่อนครบ 30 วินาที

Then:
- ได้ 429
- คำขอที่ถูกปฏิเสธไม่เปลี่ยน Challenge เดิม

---

## REC-006 — Token ใหม่แทน Token เดิม [P1]

Given:
Session เดิมผ่าน Cooldown แล้ว

When:
ขอ Token ใหม่และทดลองใช้ Token เดิม

Then:
- Token เดิมได้ 400
- Token ใหม่ยังใช้ได้ตามเงื่อนไข

---

## REC-007 — Token Expiration [P0]

Given:
Challenge ถึงหรือเกินเวลาหมดอายุ

When:
Reset ด้วย Token ดังกล่าว

Then:
- ได้ 400
- Password Hash ไม่เปลี่ยน

---

## REC-008 — Password Validation [P0]

Given:
มี Token ที่ยังใช้ได้

When:
Reset ด้วย Password สั้นกว่า 8 ตัวอักษร, ซ้ำกับเดิม หรือเกิน 72 UTF-8 bytes

Then:
- ทุกกรณีได้ 400
- ไม่เปลี่ยน Password Hash

---

## REC-009 — Reset สำเร็จและ Login ได้ [P0]

Given:
Token ถูกต้องและ Password ใหม่ผ่าน Validation

When:
Reset แล้ว Login ด้วย Password เดิมและใหม่

Then:
- Hash ถูกอัปเดต
- Password เดิม Login ได้ 401
- Password ใหม่ Login สำเร็จ

---

## REC-010 — Session เก่าหมดสิทธิ์จาก Recovery จริง [P0]

Given:
User Login อยู่ใน Session A และขอ Token ใน Session B

When:
ทำ Reset จาก B แล้วเรียก /api/auth/me ใน A

Then:
- Session A ได้ 401
- ต้องยืนยันผ่าน Recovery Flow จริง ไม่ใช่เพียงแก้ Hash ใน Fixture

---

## REC-011 — CSRF Recovery [P0]

Given:
ไม่มี CSRF Token

When:
POST Request หรือ Reset

Then:
- ได้ 403
- ไม่มี Password ถูกเปลี่ยน

---

## REC-012 — Mock ไม่เปิดใน Production [P0]

Given:
เปิดด้วย Profile prod และ dev,prod

When:
เรียก Recovery endpoints

Then:
- ไม่มี Mock Recovery Controller/Response ในทั้งสอง Profile

---

## REC-013 — Email ไม่มีบัญชี [P1]

Given:
ไม่มีผู้ใช้ตาม Email ที่ส่ง

When:
POST Recovery Request

Then:
- ได้ 200 แต่ resetToken ว่าง
- ไม่มีการเปลี่ยนบัญชีใด

---

## 7. Test Strategy

- Integration: `MockRecoveryIT` ใน `com.eventhub.integration.payment` พร้อม SpringBootTest, MockMvc, H2 และ `MockPaymentDbTestSupport`
- ตรวจทั้ง HTTP Status, Session State, PasswordEncoder.matches และการ Login จริง
- เพิ่ม Test ของ Config, CSRF, Profile gating, Unknown Email และ Recovery Reset ข้าม Session หากยังไม่มีในชุด Test
- การตรวจ Expiration ใช้ Test Fixture ควบคุมเวลา ไม่ใช้ Thread.sleep 15 นาที

## 8. Test-first Workflow

### Phase A — Backend Skeleton

Backend Commit แรกใน `feat/backend-identity-recovery-security` ต้องมีเอกสารฉบับนี้และ Compile-ready Skeleton ของ API/Service ที่กำลังเพิ่ม โดย Business Logic ที่ยังไม่เสร็จให้ Throw `UnsupportedOperationException` หรือคงสภาพ Stub อย่างชัดเจน ห้ามนำ Implementation ฉบับ Green มาปะปนในขั้นนี้

### Phase B — QA RED

QA แตก `test/identity-recovery-security` จาก Backend Commit แรก เขียน Tests ตาม Requirement ID แล้วรัน RED ก่อน Backend เติม Business Logic ให้แนบ Compiler/Assertion Log จริง และแยก `COMPILE_RED` ออกจาก `ASSERTION_RED`

### Phase C — Backend GREEN

Backend รับ Tests ของ QA กลับเข้า Feature Branch แล้วเติม Business Logic โดยไม่ลด Assertion หรือปิด Test จากนั้นรัน `mvnw clean verify` ให้ผ่าน

### Phase D — QA Verification

QA ดึง Implementation ล่าสุดมาทดสอบซ้ำ เก็บผล Test/Regression และอ้าง Commit SHA/CI Run จริงก่อนยืนยันพร้อม Merge

## 9. Definition of Done

- REC-001 ถึง REC-013 ผ่านตาม Priority ที่ทีมยืนยัน
- ไม่เปิด Mock Recovery เมื่อมี prod Profile
- ไม่มีการปิด CSRF และไม่มี Password Plain Text ใน Database/Response
- QA เก็บผล Test ครั้ง RED และ GREEN พร้อม Commit SHA จริง