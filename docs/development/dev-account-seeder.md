# Dev Account Seeder

Only with Spring profile `dev` (and **not** `prod`) the application creates three local testing accounts on startup.

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@example` | `11111111` |
| STAFF | `staff@example` | `11111111` |
| USER | `user@example` | `11111111` |

## Start locally

From `backend/`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

The existing `application-dev.yml` uses a file-based H2 database at `backend/data/eventhub` (relative to the process working directory). The seed runs at application startup after Spring initializes JPA.

## Safety and repeatability

- The component uses `@Profile("dev & !prod")` and is absent in the default, `test`, and `prod` profiles.
- It inserts **only missing** emails, and does not reset an existing account's role or password.
- Passwords are **BCrypt hashed** via the existing `PasswordEncoder` bean, never stored as plaintext.
- Passwords are deliberately weak demo credentials: never enable the `dev` profile against a public or production database.
- For an existing account with one of these emails, use that account's existing credentials (the seeder will not overwrite it).
- The default `application.yaml` does not set an active profile: **you must explicitly select `dev`**.

## Tests

```powershell
cd backend
.\mvnw.cmd "-Dtest=DevAccountSeederTests" test
.\mvnw.cmd "-Dtest=DevAccountSeederIT" test
.\mvnw.cmd clean verify
```

The integration test uses a **temporary in-memory H2 database** even though the active profile is `dev`, to avoid touching local file-backed data.

For authenticated API calls, first GET `/api/auth/csrf`, then POST `/api/auth/login` with session cookie and CSRF token; refresh CSRF after login.


## ข้อมูลตัวอย่างสำหรับเดโม

เปิดโปรไฟล์ `dev` ตามคำสั่งด้านบน ระบบจะเพิ่มอีเวนต์ที่ขึ้นต้นด้วย `[DEV]` ลงใน H2 เดิมครั้งเดียวต่อชุด เวลาเริ่มงานและช่วงเช็กอินอ้างอิงเวลาไทย ณ วันที่สร้างชุด

สำหรับวันพรีเซนต์ ให้ใช้ฐาน H2 แยกเพื่อเริ่มจากอีเวนต์ตัวอย่าง 7 รายการ โดยรันจากโฟลเดอร์ `backend` และสร้างโฟลเดอร์ `../tmp` ก่อนถ้ายังไม่มี

```powershell
New-Item -ItemType Directory -Force ../tmp | Out-Null
$env:SPRING_DATASOURCE_URL = 'jdbc:h2:file:../tmp/eventhub-rehearsal'
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev,local-mail"
```

```bash
mkdir -p ../tmp
SPRING_DATASOURCE_URL=jdbc:h2:file:../tmp/eventhub-rehearsal ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev,local-mail
```

เปิด Frontend ด้วย `npm run dev` จากโฟลเดอร์ `frontend` และเปิด Mailpit เพื่ออ่าน OTP ทดสอบ ชุดที่สร้างใหม่ลองจองบัตรฟรีและบัตรเสียเงิน รวมถึงเช็กอินหน้างานและออนไลน์ได้อย่างน้อย 7 วันนับจากเวลาสร้างชุด เมื่อครบช่วงเดโม ให้เปลี่ยนชื่อไฟล์ H2 ในคำสั่งเป็นชื่อใหม่เพื่อสร้างชุดตามเวลาปัจจุบัน

| ต้องการทดสอบ | ใช้ข้อมูลนี้ |
| --- | --- |
| จองบัตรฟรี ซื้อบัตร และยกเลิกการจอง | เปิด **เวิร์กช็อปทำโปสเตอร์** เลือกบัตรฟรีหรือบัตรราคา 150 บาท ใช้บัญชี `user@example` หรือจองแบบ Guest ด้วยอีเมลใหม่ |
| QR, ประวัติ และการชำระเงิน | เข้าบัญชี `user@example` ดูรายการเดิมใน **ตั๋วของฉัน**, **การลงทะเบียนของฉัน** และ **ประวัติการชำระเงิน** |
| เช็กอินหน้างาน | เปิดบัตร **พบปะนักพัฒนา** จากบัญชี `user@example` แล้วใช้บัญชี `staff@example` เช็กอินด้วยรหัสบนบัตร |
| เช็กอินออนไลน์ | เปิด **ตั๋วของฉัน** ด้วยบัญชี `user@example` เลือกบัตร **พบปะออนไลน์** ระหว่างจัดงาน กด **เช็กอินและรับลิงก์** แล้วกด **เปิดห้องออนไลน์** เพื่อเข้าหน้าห้องตัวอย่างของ EventHub |
| เพิ่มบัตร Guest เข้าบัญชี | ใช้ `dev,local-mail` พร้อม Mailpit สมัครด้วย `guest.demo@example.test` แล้วขอ OTP ใน **การลงทะเบียนของฉัน** อีเมลที่ใช้จองดูได้จากรายชื่ออีเวนต์ **พบปะนักพัฒนา** |
| ดูตัวอย่าง Guest ที่ย้ายบัตรแล้ว | เข้าบัญชี `demo.claimed@example.test` ด้วยรหัสผ่านเดโม แล้วเปิดประวัติ |
| ตรวจสถานะชำระเงินที่รอยืนยัน | วันพรีเซนต์ให้เริ่มซื้อบัตร 150 บาทใน **เวิร์กช็อปทำโปสเตอร์** ด้วยบัญชีที่ยังไม่มีบัตรของงาน แล้วหยุดที่หน้าชำระเงินจำลองก่อนกดยืนยัน รายการที่ระบบสร้างให้ `demo.attendee@example.test` รอได้เพียง 10 นาทีหลังสร้างชุด |
| ลองบัตรฟรีและบัตรเสียเงินในงานเดียวกัน | ใช้คนละบัญชีหรือจองแบบ Guest ด้วยอีเมลทดสอบแยกกัน เพื่อให้ลองทั้งสองแบบได้โดยมีบัตรของแต่ละรายการอยู่พร้อมกัน |
| รายงาน Admin | มีงานกำลังจัด ใกล้เต็ม เต็ม ปิดรับจอง และงานที่จบแล้ว พร้อมยอดเข้าชม จองไม่ทัน และอัตราเช็กอิน |

ถ้าต้องการชุดที่ใช้เวลาปัจจุบันอีกครั้ง ให้เลือกชื่อใหม่ที่เป็นตัวอักษรอังกฤษ ตัวเลข หรือขีดกลาง แล้วเปิด Backend ใหม่ ชุดก่อนหน้ายังอยู่ในฐานเดิม อีเมลตัวอย่างของชุดใหม่มีชื่อชุดต่อท้าย เช่น `guest.demo+demo2@example.test`

Windows PowerShell

```powershell
$env:APP_DEV_DEMO_SET = 'demo2'
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev,local-mail"
```

macOS

```bash
APP_DEV_DEMO_SET=demo2 bash ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev,local-mail
```

ตั้ง `APP_DEV_DEMO_ENABLED=false` หากต้องการเปิด dev โดยข้ามการเพิ่มชุดข้อมูลตัวอย่าง
