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
- ตรวจผลและ SHA ของแต่ละรอบจาก GitHub Actions ก่อนรายงานว่าผ่าน

## Known Issues

- Backend ปัจจุบัน Check-in ซ้ำตอบ HTTP 200 แต่ไม่เปลี่ยนเวลาเดิม (Idempotent) ไม่ใช่ HTTP 409; หากต้องการเปลี่ยนให้ PM/Backend ตกลง Requirement ก่อน
- Expiration Test จะรอ Backend TTL จริง ไม่ Mock เวลา
- สคริปต์สร้าง Event และ USER ใหม่ต่อเคสเพื่อป้องกัน Tests แย่งข้อมูลกัน
- หากมีการแก้ UI/Business Rules ต้องปรับ Assertions ตาม Requirements ที่อนุมัติ ห้ามปิดหรือ Skip Test เพื่อทำให้ Green

อ่านรายละเอียดฉบับส่งอาจารย์ได้ที่ [รายงาน Automated Browser E2E](../docs/testing/automated-browser-e2e.md) และ [รายงาน Audit Manual Evidence](../docs/testing/e2e-existing-evidence-audit.md)

## CI browser regression

`.github/workflows/browser-e2e.yml` runs the nine fast Chromium scenarios on pull requests to `main` and pushes to `main` or `ci/**`. The real expiration case (`@slow`, about ten minutes) remains available with `E2E_SUITE=slow` and is not part of this job. The job builds the frontend and backend, serves the built frontend over loopback, and uses the `e2e` profile with disposable in-memory H2. It generates and masks a fresh test-only seed password for each run; it does not use repository or production credentials. The existing Maven test and Minikube jobs remain independent.

The same workflow runs the guest journey in the separate `guest-browser-e2e` job. It builds both applications and invokes `python3 e2e/run-guest.py`, which starts its own disposable H2 database, loopback SMTP server and frontend. The fast and guest jobs have independent results and upload separately named artifacts, including on test failure. Check both jobs for the commit under review; a successful fast run alone does not establish that the guest journey passed.

The HTML and JUnit reports and failure traces, videos, screenshots and startup logs are retained for seven days. These artifacts can contain generated test account credentials, session cookies, CSRF tokens, and ticket codes. Treat them as sensitive test data and restrict access to the repository's Actions artifacts. Do not reuse real credentials or send actual email in this environment.

## Guest browser journey with SMTP

จาก root ของโปรเจกต์ ให้แพ็ก Backend และ build Frontend ก่อน ใช้ Java 21, Node.js 20 ขึ้นไป และ Python 3

```sh
mvn -f backend/pom.xml -DskipTests package
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix e2e ci
npm exec --prefix e2e -- playwright install chromium
python e2e/run-guest.py
```

คำสั่งสุดท้ายเปิด Frontend, Backend โปรไฟล์ `e2e` และ SMTP รับอีเมลทดสอบบน loopback ด้วยพอร์ตที่ระบบเลือก ใช้ H2 ในหน่วยความจำและสร้างรหัสผ่านทดสอบใหม่ต่อรอบ ข้อความ OTP ส่งเข้าไฟล์ชั่วคราวของรอบทดสอบและถูกลบเมื่อจบ ใช้บัญชี `example.test` ได้โดยไม่ต้องมีบริการอีเมลภายนอก

ชุดนี้ครอบคลุมการจองฟรีและยกเลิก, การเปิดและยกเลิกการชำระเงินที่ค้าง, และเส้นทางจ่ายเงิน → OTP → ย้ายรายการเข้าบัญชี → เช็กอินด้วยบัตรเดิม → ตรวจรายงาน Admin รวมถึงช่วงวันที่ไม่มีข้อมูล

ตัวรันส่งต่ออาร์กิวเมนต์ให้ Playwright ได้ เช่น `python e2e/run-guest.py --grep "Guest pays"` ผลอยู่ที่ `e2e/artifacts/` ตามการตั้งค่าเดิม เก็บ trace และหลักฐานที่อาจมีข้อมูลบัญชีทดสอบหรือ OTP ไว้ในพื้นที่จำกัดสิทธิ์
