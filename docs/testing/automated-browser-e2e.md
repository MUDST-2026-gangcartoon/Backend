# รายงานการทดสอบ End-to-End อัตโนมัติ — EventHub (บทเรียนสัปดาห์ที่ 7)

**โครงการ:** EventHub — Gangcartoon  
**ผู้รับผิดชอบ:** ทีม Quality Assurance (QA)  
**ขอบเขต:** ทดสอบการใช้งานจริงผ่าน Browser → React Frontend → Spring Boot Backend → H2 Test Database  
**วันที่ปรับปรุงเอกสาร:** 17 ตุลาคม 2569  
**สถานะหลักฐาน:** P0 จำนวน 1 เคสมีผล **PASS จากการรัน Local ที่ผู้ทดสอบส่งมา**; เคสที่เพิ่มใหม่ยังต้อง Execute และ Verify ก่อนรายงานว่า PASS; GitHub Actions ยังไม่ได้รัน Workflow ใหม่  
**ข้อห้าม:** ห้ามใช้ฐานข้อมูล Production/Development, ห้าม Commit รหัสผ่านหรือ Session Token และยังไม่ Commit/Push การเปลี่ยนแปลงชุดนี้

## 1. วัตถุประสงค์และความแตกต่างของชุดทดสอบ

การทดสอบเดิมของทีมมี Unit/Controller/Repository Tests, Integration Tests และ Manual E2E E2E-001 ถึง E2E-008 พร้อมเอกสารและ Screenshot การเพิ่ม Playwright ครั้งนี้ไม่ได้สร้างหลักฐาน Manual ใหม่แทนของเดิม แต่ทำให้ตรวจสอบ User Flow ผ่าน Chromium ได้โดยอัตโนมัติ พร้อม Assertions และ Test Report ที่ตรวจสอบย้อนกลับได้

- **Unit/Automated Backend Tests:** ตรวจสอบ Business Logic / API ตามขอบเขตของ Test Class
- **Integration Tests:** ตรวจสอบการทำงานร่วมกัน เช่น Repository, Transaction และ Database
- **Manual E2E:** ผู้ทดสอบกดผ่าน Browser และเก็บหลักฐานเป็นรายเคส
- **Automated Browser E2E:** Playwright เปิด Browser จริง ใช้ React UI จริง ติดต่อ Spring Boot และ H2 แยกต่างหาก โดย **ไม่ Mock API Response**

**หลักการสำคัญ:** การมี Test Script ไม่ได้แปลว่าทดสอบผ่าน ต้องดู Result, Duration และ Evidence จากการ Execute จริงเท่านั้น

## 2. ขอบเขต Automated Tests ที่เพิ่ม

| Test ID | อ้างอิง Manual | กรณีทดสอบ | จุดตรวจสอบหลัก | สถานะหลักฐาน |
|---|---|---|---|---|
| E2E-AUTO-001 | E2E-002/003/004/008 บางส่วน | ชำระเงิน → ออกตั๋ว → STAFF Check-in → Check-in ซ้ำ | Pending/Confirmed, Registration, QR, checkedInAt คงเดิม | **PASS เฉพาะ Local Run เดิมที่ผู้ใช้รายงาน 1/1** |
| E2E-AUTO-002 | E2E-001 | บัตรฟรี → My Tickets → STAFF Check-in | ราคา 0, ไม่มี Payment, QR, Check-in | ยังไม่ยืนยันผลรัน |
| E2E-002 | E2E-002 | Checkout ค้าง Pending | HTTP 201, PENDING_PAYMENT, ยังไม่มีตั๋ว | ยังไม่ยืนยันผลรัน |
| E2E-003 | E2E-003 | ยืนยัน Mock Payment | CONFIRMED, Registration และ QR Ticket | ยังไม่ยืนยันผลรัน |
| E2E-004 | E2E-004 | STAFF Check-in ด้วย Ticket ใหม่ใน Test เดียวกัน | checkedIn, checkedInAt, Attendee | ยังไม่ยืนยันผลรัน |
| E2E-AUTO-004 | E2E-005 | ยกเลิก Registration ที่ชำระแล้ว | DELETE 204, ตั๋วเก่า 404, Payment History ยังคงอยู่ | ยังไม่ยืนยันผลรัน |
| E2E-AUTO-003 | E2E-006 | Payment Authorization | Guest 401, ADMIN/STAFF 403, Non-owner 404, Owner 200 | ยังไม่ยืนยันผลรัน |
| E2E-007 (@slow) | E2E-007 | Payment หมดอายุจริง | EXPIRED, Confirm 409, ไม่มีตั๋ว | ยังไม่ยืนยันผลรัน; ใช้เวลาประมาณ 10 นาที |
| E2E-008 | E2E-008 | Confirm Payment ซ้ำ | Registration ID/Code เดิม, ไม่มี Duplicate | ยังไม่ยืนยันผลรัน |
| E2E-AUTO-005 | งาน P1 เพิ่มเติม | ADMIN สร้าง Event → USER เปิดดู | Event ใหม่ปรากฏต่อ USER ผ่าน Frontend/API | ยังไม่ยืนยันผลรัน |

**รวม 10 Automated Tests** ใน 2 Spec Files ไม่รวม Helper File (`support.mjs`)  
คำว่า “ยังไม่ยืนยันผลรัน” หมายถึงไม่เคยได้รับ Execution Report ของ Test นั้นในการจัดทำเอกสารฉบับนี้ ไม่ได้หมายถึง Test Fail

### การออกแบบให้แยกจากกัน

- P0 ใช้ USER ใหม่จาก Seed `e2e.user@example.com` และ `[E2E] Open Workshop`
- Tests อื่นสร้าง Event แยกผ่านหน้า ADMIN และใช้บัญชี USER ใหม่จากหน้า Signup เพื่อไม่แย่ง Capacity หรือ Payment ของ Test อื่น
- Event ID ได้จาก Response ที่ Backend สร้างจริง, ไม่กำหนดตัวเลขคงที่
- Ticket Code ได้จาก Confirm/Registration จริง, ไม่ใช้ Fixture Code ที่ Hardcode
- `workers=1`, `fullyParallel=false` ป้องกันการแย่ง Shared Seeder; แต่ละ Test มีข้อมูลตนเอง
- ระบบใช้ Fresh H2 Seed ทุกครั้งที่ Restart Backend Profile `e2e` ตาม Database Contract

## 3. ข้อมูล Test Environment

อ้างอิง `docs/development/e2e-database-contract.md`

| รายการ | ค่าที่ใช้ |
|---|---|
| Backend | Spring Boot / Java 21 / Profile `e2e` เท่านั้น |
| Database | H2 In-memory: `jdbc:h2:mem:eventhub_e2e;DB_CLOSE_DELAY=-1` |
| Schema | Hibernate `create-drop` ใช้เฉพาะระบบทดสอบที่แยกไว้ |
| Frontend | React + Vite ผ่าน `http://127.0.0.1:5173` |
| Backend API | `http://127.0.0.1:8080` ผ่าน Vite Proxy ที่ `/api` |
| Browser | Chromium / Playwright |
| E2E Accounts | `e2e.admin@example.com`, `e2e.staff@example.com`, `e2e.user@example.com` และบัญชีใหม่จาก Signup |
| Password | `APP_E2E_SEED_PASSWORD` และ `E2E_SEED_PASSWORD` ต้องเป็นค่าเดียวกัน และใช้เฉพาะ Test |
| Protection | `E2E_CONFIRM_ISOLATED=yes` + ตรวจพบ Seed Events จริง; Base URL ต้องเป็น Loopback |

**Seed Data:** Open Workshop มี General 100 บาท และ VIP 250 บาท ส่วน Full Workshop มีบัตรฟรีแต่เต็มอยู่แล้ว ดังนั้น Test บัตรฟรีจะให้ ADMIN สร้าง Event ใหม่ที่ยังมี Capacity

**ข้อจำกัด:** การตรวจ Seed Events เป็นเงื่อนไขป้องกันความผิดพลาดเพิ่มเติม ไม่ใช่การยืนยันตัวตน Database แบบสมบูรณ์ ผู้ทดสอบต้องตรวจด้วยตนเองก่อนทุกครั้งว่าพอร์ต 8080 เป็น Backend Profile `e2e` บนฐานข้อมูลทดสอบเท่านั้น

## 4. ไฟล์ที่เกี่ยวข้อง

```text
e2e/
  package.json                     # เครื่องมือและคำสั่ง Playwright
  playwright.config.mjs            # Chromium, Report, Trace, เวลาทดสอบ
  tests/
    paid-ticket-checkin.spec.mjs   # P0 Critical Full-Stack Flow
    additional-flows.spec.mjs      # กรณีเพิ่มเติมครบทั้ง 8 Manual Scenarios + ADMIN
    support.mjs                    # ฟังก์ชันร่วมและ E2E Isolation
  README.md                        # คู่มือภาษาไทย
.github/workflows/browser-e2e.yml  # Automated Browser E2E Job
docs/testing/
  automated-browser-e2e.md        # เอกสารฉบับนี้
  e2e-existing-evidence-audit.md # ตรวจเอกสารและภาพ Manual เดิม
```

ไม่แก้หรือลบ Backend/Frontend Production Business Logic, Manual E2E PDF/Screenshot หรือ Minikube Smoke Test เดิม

## 5. ขั้นตอนติดตั้งและทดสอบในเครื่อง

**ก่อนเริ่ม:** ติดตั้ง JDK 21, Node.js 20+ และ npm; เปิด Terminal 3 หน้าต่าง; **ปิด Development Backend ที่ใช้พอร์ต 8080 ก่อน** แล้วตรวจว่าฐานข้อมูลที่จะใช้เป็น H2 สำหรับ E2E เท่านั้น

### Terminal A — เปิด Backend แบบ E2E

**macOS / Linux:**

```bash
cd /path/to/Backend
export SPRING_PROFILES_ACTIVE=e2e
export APP_E2E_SEED_PASSWORD='<รหัสผ่านเฉพาะ E2E ที่ตั้งเอง>'
./mvnw -f backend/pom.xml -DskipTests spring-boot:run
```

**Windows PowerShell:**

```powershell
cd "D:\Users\user\Desktop\dev-op\Backend"
$env:SPRING_PROFILES_ACTIVE = "e2e"
$env:APP_E2E_SEED_PASSWORD = "<รหัสผ่านเฉพาะ E2E ที่ตั้งเอง>"
.\mvnw.cmd -f backend\pom.xml -DskipTests spring-boot:run
```

### Terminal B — เปิด Frontend

```bash
cd /path/to/Backend/frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

### Terminal C — ติดตั้งและรัน Browser Tests

```bash
cd /path/to/Backend/e2e
npm install --no-audit --no-fund
npx playwright install chromium
E2E_SEED_PASSWORD='<ค่าเดียวกับ Backend>' E2E_CONFIRM_ISOLATED=yes E2E_BASE_URL=http://127.0.0.1:5173 npm run test:fast
```

ครั้งแรกใช้ `npm install` เพื่อสร้าง `e2e/package-lock.json`; ตรวจไฟล์นี้ก่อนส่งทีม CI/CD และใช้ `npm ci` เมื่อมี Lockfile แล้ว

**Windows PowerShell:** ตั้ง `$env:E2E_SEED_PASSWORD`, `$env:E2E_CONFIRM_ISOLATED = "yes"`, `$env:E2E_BASE_URL = "http://127.0.0.1:5173"` แล้วรัน `npm run test:fast`

คำสั่ง:
- `npm run test:fast` — ทดสอบ 9 เคสโดยไม่รวม Expiration จริง (เหมาะสำหรับ Debug เร็ว)
- `npm test` — **ทดสอบครบทั้ง 10 เคส** รวม Expiration จริงประมาณ 10 นาที
- `npm run test:headed` — เห็น Chromium คลิกจริง (รวมเคสช้า)
- `npm run report` — เปิด HTML Report

**การรันซ้ำ:** ต้อง Restart Backend E2E เพื่อ Reset H2 ใหม่ก่อน Run เต็มอีกครั้ง ห้ามใช้ Backend Development/Production แทนเพื่อให้ Test ผ่าน

### คำสั่งตรวจ Test Case เดียว

```bash
npm test -- --grep "E2E-AUTO-001"
```

## 6. Assertions และการเก็บผล

Test ตรวจ HTTP Status, Payment State, Registration Count/ID, Ticket Code, UI Ticket/QR และ Checked-in Timestamp ตามแต่ละ Scenario ไม่ใช้ Mock Responses

กรณีไม่มีปุ่ม UI สำหรับการทำ Negative Action (เช่น Confirm Payment เดิมซ้ำ หรือ Confirm หลังหมดอายุ) Playwright ยังใช้ Browser UI ทำ Happy Path ก่อน แล้วเรียก **Backend API จริงใน Browser Context เดียวกัน** เพื่อทดสอบพฤติกรรมดังกล่าวอย่างชัดเจน

รายงานหลังรัน:
- `e2e/artifacts/html/index.html` — Pass/Fail, Duration, Screenshots และ Step Information
- `e2e/artifacts/junit.xml` — รายงาน JUnit XML
- `e2e/artifacts/test-results/` — Trace/Screenshot/Video เมื่อ Fail
- ใช้ `npm run report` เพื่อดูผลย้อนหลัง

**ข้อควรระวัง:** Trace, HTML Report และ Screenshot อาจมี Ticket Code, Session Cookie หรือ CSRF Token ของบัญชีทดสอบ ห้ามนำข้อมูลลับไปใส่สไลด์โดยไม่ตรวจและปิดบังก่อน

## 7. GitHub Actions และการส่งต่อ CI/CD

เตรียมไฟล์ `.github/workflows/browser-e2e.yml` แยกจาก `minikube-e2e.yml` เดิม โดย CI ทำงานตามลำดับ:

1. Checkout Repository และติดตั้ง Java/Node/Chromium
2. สร้าง Password สำหรับ E2E แบบ Ephemeral ผ่าน Environment Variable
3. เปิด Spring Boot Profile `e2e` / H2 In-memory และ Frontend Vite
4. ตรวจ Health และรัน Playwright Browser Tests
5. ทำ Job Fail หาก Assertions ไม่ผ่าน (**ห้าม `continue-on-error`**)
6. Upload HTML, JUnit, Screenshot, Trace เป็น Artifacts แม้ Tests Fail
7. หยุด Processes และทำความสะอาดเมื่อ Job จบ

**Workflow ยังไม่ผ่าน CI จริง** เพราะเจ้าของงานยังไม่อนุญาต Commit/Push กรุณาให้ทีม CI/CD ตรวจไฟล์และนำขึ้น Repository ตามกระบวนการอนุมัติก่อน จึงสามารถสร้าง GitHub Actions Run URL สำหรับส่งอาจารย์ได้

## 8. ผลการทดสอบที่ยืนยันได้ ณ เวลาจัดทำเอกสาร

### หลักฐาน Local P0 ที่ผู้ทดสอบส่งมา

```text
✓ 1 tests/paid-ticket-checkin.spec.mjs:65:1
  E2E-AUTO-001: Paid Checkout → Confirm → My Tickets → Staff Check-in (real stack) (8.9s)
1 passed (12.2s)
```

ผลข้างต้นแสดงว่า P0 Script **เวอร์ชันก่อนเพิ่มเคสอื่น** ผ่านใน Local E2E Environment ที่ผู้ทดสอบเปิด โดยใช้เวลา Test 8.9 วินาที และเวลารันรวม 12.2 วินาที

**ห้ามนำผล 1 Passed ไปอ้างว่า 10 Tests ผ่านทั้งหมด** จนกว่าจะมีการรัน Full Suite และตรวจรายงานใหม่

| หมวด | สถานะ |
|---|---|
| P0 Local Run ก่อนเพิ่ม Scripts | PASS 1/1 (อ้างอิง Terminal Output ของ QA) |
| Full 10-test Suite หลังเพิ่ม Scripts | **ยังไม่ได้รันยืนยัน** |
| CI Browser E2E | **ยังไม่ได้รันยืนยัน** |
| Manual E2E 8 Cases | ดู Audit แยก ตรวจ Evidence และ Expected Result รายเคส |
| Existing Backend Tests / JaCoCo | ใช้หลักฐาน CI เดิมแยกจาก Automated Browser E2E |

## 9. ข้อจำกัดที่ต้องแจ้งอาจารย์และ PM

1. **Check-in ซ้ำ:** Backend ปัจจุบันตอบ HTTP 200 และคงค่า `checkedInAt` เดิม เป็น Idempotent Behavior ไม่ได้ Reject ด้วย HTTP 409; ถ้า PM ต้องการ 409 ต้องให้ Backend ยืนยัน Requirement และแก้โค้ดอย่างเป็นทางการ
2. **Expiration:** E2E-007 ใช้เวลา TTL จริงราว 10 นาทีเพื่อไม่ Mock เวลา อาจทำให้ CI ช้ากว่า Tests อื่น
3. **ข้อมูลทดสอบ:** Test เพิ่มเติมสร้าง Account และ Event ใหม่จริงบน H2 E2E เท่านั้น ต้อง Reset Backend Process ก่อนรันซ้ำ
4. **CI Confirmation:** Workflow ไฟล์อย่างเดียวไม่ใช่หลักฐาน CI ผ่าน ต้องมี GitHub Actions Run และ Report Artifact จริง
5. **ความครอบคลุม:** Automated Browser E2E ไม่ได้แปลว่า Features ทั้งหมดของระบบไร้ข้อผิดพลาด ต้องใช้ Manual, Unit, Integration และ JaCoCo ร่วมกัน

## 10. รายการส่งมอบ QA → PM / CI/CD

- Test Scripts และ Helpers ใน `e2e/tests/` พร้อม Config, Dependencies และ README
- ตาราง Mapping ระหว่าง 8 Manual Scenarios กับ 10 Automated Tests (ข้อ 2)
- รายงานผลจริง: Pass/Fail, Duration, วันที่รัน, Environment, SHA และภาพ/Trace
- ความแตกต่างระหว่าง Local Run และ CI Run
- GitHub Actions Workflow และ Artifact URL **หลังจาก CI ผ่านจริง**
- บันทึก Known Issues, Environment Isolation และข้อเสนอสำหรับปรับปรุง
- ไม่ Commit/Push จนกว่าเจ้าของโปรเจกต์อนุญาต

## 11. ข้อความอธิบายต่ออาจารย์ (เมื่อ Full Suite ผ่านจริง)

> QA เพิ่ม Automated Browser E2E ด้วย Playwright โดยทดสอบการใช้งานผ่าน React Frontend เชื่อมต่อ Spring Boot API และ H2 E2E Database จริง ไม่ได้ Mock API Response ครอบคลุม Flow การลงทะเบียนบัตรฟรีและบัตรเสียเงิน การยืนยันชำระเงิน การออกตั๋ว STAFF Check-in การยกเลิก สิทธิ์การเข้าถึง Payment และการป้องกันรายการซ้ำ ผลการทดสอบบันทึกเป็น Playwright HTML Report พร้อมเวลาและหลักฐาน และเตรียมรันผ่าน GitHub Actions ในสภาพแวดล้อมที่แยกจาก Production

**เติมจำนวน Passed/Failed/Duration และ CI Run URL เฉพาะเมื่อมีหลักฐานจริงเท่านั้น**
