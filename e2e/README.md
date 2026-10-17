# คู่มือใช้งาน Automated Browser E2E — EventHub (Playwright)

ชุดนี้เป็น **Automated End-to-End Tests ผ่าน Chromium จริง** เชื่อมต่อ React Frontend, Spring Boot API และ H2 Database สำหรับทดสอบโดยเฉพาะ โดยไม่ Mock API Response

## สิ่งที่มีในชุดทดสอบ

- `tests/paid-ticket-checkin.spec.mjs` — P0: User Paid Ticket → Checkout → Confirm → QR Ticket → Staff Check-in → ตรวจการเรียก Check-in ซ้ำ
- `tests/additional-flows.spec.mjs` — 9 Tests เพิ่มเติม ครอบคลุม Manual E2E-001 ถึง E2E-008 รวมทั้ง ADMIN Event Management
- `tests/support.mjs` — ฟังก์ชันช่วย Login, Signup, สร้าง Event ผ่าน ADMIN UI, ตรวจ API และแยก Test Data
- `playwright.config.mjs` — ตั้ง Chromium, Reporter, Timeout, Screenshot และ Trace
- `package.json` — คำสั่งและ Dependency
- `artifacts/` — HTML Report, JUnit XML, Screenshot, Trace และ Video (ไม่ควร Commit)

**รวม 10 Automated Tests** (รวม P0) โดย `E2E-007` เป็นกรณีรอ Expiration จริงประมาณ 10 นาที

## การเริ่มทดสอบ

**ก่อนเริ่ม ต้องตรวจว่าพอร์ต 8080 ไม่ได้ใช้ Development/Production Backend** เพราะ Test นี้สร้าง User, Event และ Payment ในฐานข้อมูลที่ใช้เชื่อมต่อ

เปิด 3 Terminal:

### 1) Backend (Profile e2e / H2 Test DB)

macOS / Linux:

```bash
cd /path/to/Backend
export SPRING_PROFILES_ACTIVE=e2e
export APP_E2E_SEED_PASSWORD='<E2E TEST ONLY PASSWORD>'
./mvnw -f backend/pom.xml -DskipTests spring-boot:run
```

Windows PowerShell:

```powershell
cd "D:\Users\user\Desktop\dev-op\Backend"
$env:SPRING_PROFILES_ACTIVE="e2e"
$env:APP_E2E_SEED_PASSWORD="<E2E TEST ONLY PASSWORD>"
.\mvnw.cmd -f backend\pom.xml -DskipTests spring-boot:run
```

### 2) Frontend

```bash
cd /path/to/Backend/frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

### 3) Playwright

```bash
cd /path/to/Backend/e2e
npm install --no-audit --no-fund
npx playwright install chromium
E2E_SEED_PASSWORD='<SAME TEST PASSWORD>' E2E_CONFIRM_ISOLATED=yes E2E_BASE_URL=http://127.0.0.1:5173 npm run test:fast
```

สำหรับ Windows ให้ตั้งค่า `$env:E2E_SEED_PASSWORD`, `$env:E2E_CONFIRM_ISOLATED="yes"`, `$env:E2E_BASE_URL` ก่อนรัน

## คำสั่งหลัก

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run test:critical` | รันเฉพาะ Critical P0 (เร็ว) |
| `npm run test:fast` | รัน 9 Tests โดยไม่รวม Expiration ที่ใช้เวลาประมาณ 10 นาที |
| `npm test` | รัน 10 Tests รวม Expiration จริง |
| `npm run test:headed` | เปิด Browser ให้เห็นการทำงานขณะทดสอบ |
| `npm run report` | เปิด Playwright HTML Report |

**ก่อน Run เต็มซ้ำ:** ให้หยุด Backend E2E แล้วเปิดใหม่ เพื่อ Reset H2 In-memory เป็นข้อมูล Seed เริ่มต้น สถานะการผ่านของแต่ละเคสต้องอ่านจาก Report จริงเสมอ

## หลักฐานและรายงาน

- `artifacts/html/index.html` — HTML Report (Pass/Fail, Duration, Attachments)
- `artifacts/junit.xml` — รายงาน JUnit XML
- `artifacts/test-results/` — Trace/Screenshot/Video ตอนล้มเหลว

**ควรตรวจและปิดบัง Password, CSRF, Cookie และ Session Data ก่อนเผยแพร่ Evidence**

## CI/CD

Workflow เตรียมไว้ที่ `../.github/workflows/browser-e2e.yml` (แยกจาก Minikube Smoke Test)
- ใช้ GitHub Runner เปิด Frontend + Backend ใน Profile e2e และ Database H2 แยก
- รัน Browser จริงและตรวจ Assertions
- ไม่ใช้ `continue-on-error`
- Upload Artifacts แม้ Test Fail
- ยังไม่มีผล CI E2E ผ่านจริง จนกว่าจะได้รับอนุญาตให้นำไฟล์ขึ้น GitHub และมี Run URL

## Known Issues

- Backend ปัจจุบัน Check-in ซ้ำตอบ HTTP 200 แต่ไม่เปลี่ยนเวลาเดิม (Idempotent) ไม่ใช่ HTTP 409; หากต้องการเปลี่ยนให้ PM/Backend ตกลง Requirement ก่อน
- Expiration Test จะรอ Backend TTL จริง ไม่ Mock เวลา
- สคริปต์สร้าง Event และ USER ใหม่ต่อเคสเพื่อป้องกัน Tests แย่งข้อมูลกัน
- หากมีการแก้ UI/Business Rules ต้องปรับ Assertions ตาม Requirements ที่อนุมัติ ห้ามปิดหรือ Skip Test เพื่อทำให้ Green

อ่านรายละเอียดฉบับส่งอาจารย์ได้ที่ [รายงาน Automated Browser E2E](../docs/testing/automated-browser-e2e.md) และ [รายงาน Audit Manual Evidence](../docs/testing/e2e-existing-evidence-audit.md)
