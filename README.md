# EventFest. Admin — React

แปลงหน้าเว็บ HTML/CSS/vanilla JS เดิมของ EventFest. (แอดมิน + ทีมหน้างาน) เป็น React (Vite)

## โครงสร้าง
```
src/
  context/
    AuthContext.jsx        แทน navbar.js — สถานะล็อกอิน + login/register/logout ผ่าน React state (ยังคง sync กับ localStorage)
  components/
    AdminNavbar.jsx         navbar สำหรับแอดมิน (จาก navbar-admin.html)
    StaffNavbar.jsx          navbar สำหรับทีมหน้างาน (จาก navbar-staff.html)
    AuthModal.jsx            popup login/register ใช้ร่วมกันทั้งสอง navbar
    EventDrawer.jsx          แบบฟอร์ม สร้าง/แก้ไข อีเวนต์ (2 โหมดในคอมโพเนนต์เดียว, จาก event-drawer.html)
    AttendeesDrawer.jsx      drawer แสดงรายชื่อผู้ลงทะเบียนของอีเวนต์
  pages/
    AdminDashboardPage.jsx   แดชบอร์ดแอดมิน (จาก Admin-dashboard.html)
    ManageEventsPage.jsx     จัดการอีเวนต์ (ตาราง + สถิติ + drawer)
    RegistrantListPage.jsx   ผู้ลงทะเบียนทั้งหมด (รวมทุกอีเวนต์)
    EventCheckinSelectPage.jsx  เลือกอีเวนต์ที่จะเช็กอิน (จาก Event check-in Page.html)
    CheckinAttendeesPage.jsx    เช็กอินผู้เข้าร่วมด้วยรหัสตั๋ว (จาก Check-in attendees Page.html — ตอนนี้ทำงานได้จริงแล้ว ไม่ใช่แค่ดีไซน์)
  data/
    events.js               mock data อีเวนต์ (สำหรับหน้าแอดมิน)
    checkinEvents.js         mock data อีเวนต์ (สำหรับหน้าทีมหน้างาน)
  *.css                      สไตล์เดิมทั้งหมด นำมาใช้ต่อ (ดู "เรื่อง CSS" ด้านล่าง)
```

## เส้นทาง (routes)
| Path | หน้า |
|---|---|
| `/admin/dashboard` | แดชบอร์ดแอดมิน |
| `/manage-events` | จัดการอีเวนต์ |
| `/registrants` | ผู้ลงทะเบียนทั้งหมด |
| `/staff/checkin` | เลือกอีเวนต์ที่จะเช็กอิน |
| `/staff/checkin/:eventId` | เช็กอินผู้เข้าร่วมของอีเวนต์นั้น |

## วิธีรัน
```bash
npm install
npm run dev
```
เปิด `http://localhost:5173`

## สิ่งที่เปลี่ยนจากเดิม
- `navbar.js` (localStorage + `getElementById` ล้วนๆ) ถูกแทนที่ด้วย `AuthContext` — สถานะล็อกอิน/โมดัลอยู่ใน React state, ยัง sync กับ `localStorage.isLoggedIn` เหมือนเดิมเพื่อให้พฤติกรรมคงที่ (คงข้ามการรีเฟรชหน้า)
- `navbar-admin.html` และ `navbar-staff.html` (เดิม fetch เข้ามาด้วย `fetch()` ตอน runtime) กลายเป็นคอมโพเนนต์ `AdminNavbar` / `StaffNavbar` ที่ import ตรงๆ — ไม่มีการ fetch ไฟล์ HTML แยกอีกต่อไป
- `event-drawer.html` (เดิม inject เข้าไปใน `#drawer-placeholder`) กลายเป็น `EventDrawer.jsx` ที่รับ prop `mode="create"|"edit"` — คอมโพเนนต์เดียวใช้ได้ทั้งสองโหมด
- หน้า **เช็กอินผู้เข้าร่วม** เดิมเป็น "ดีไซน์ล้วนๆ ไม่มี JS" (ตามคอมเมนต์ในไฟล์ต้นฉบับ) ตอนนี้ทำงานได้จริง: พิมพ์รหัสที่ขึ้นต้นด้วย `GTH-` แล้วกด "เช็กอินตั๋ว" จะอัปเดตรายการ "เช็กอินล่าสุด" และตัวเลข "เช็กอินแล้ว/เหลืออีก" แบบ real-time
- ใช้ `react-router-dom` แทนการลิงก์ข้ามไฟล์ .html (`<a href="...html">`, `window.location.href = '...'`) ทั้งหมด
- ตัวเลขในแดชบอร์ด/สถิติยังเป็น mock data คงที่ (เหมือนต้นฉบับ) — พร้อมสลับไปต่อ API จริงภายหลัง

## เรื่อง CSS (สำคัญ)
ไฟล์ต้นฉบับหลายไฟล์นิยาม class ชื่อเดียวกันไม่เหมือนกัน (เช่น `.navbar`, `.nav-link` มีทั้งใน `manage-events.css` เดิมและ `navbar.css`) เพราะแต่ละหน้า .html เดิมโหลดสไตล์แยกไฟล์กันคนละหน้า จึงไม่ชนกัน แต่ React เป็น SPA ที่โหลด CSS ทุกไฟล์รวมกัน ผมจึงจัดการดังนี้เพื่อไม่ให้สไตล์ชนกัน:
- ใช้ `navbar.css` เป็นเจ้าของ class navbar ทั้งหมด (`AdminNavbar`/`StaffNavbar`/`AuthModal` ใช้ไฟล์นี้)
- ตัดส่วน "NAVBAR SYSTEM" และ "AUTH MODAL" ที่ซ้ำออกจาก `manage-events.css` (เพราะเนื้อหาซ้ำกับ `navbar.css` แต่ค่าไม่ตรงกัน)
- `checkin-attendees.css` และ `event-checkin.css` มีสไตล์ topbar/page-shell ซ้ำกันเป๊ะ ผมแยกส่วนที่ใช้ร่วมออกมาเป็น `staff-shell.css` แล้วเก็บเฉพาะสไตล์เฉพาะหน้าไว้ในไฟล์เดิม (ส่วน topbar/profile-menu แบบเก่าที่ไม่ได้ใช้จริงถูกตัดออก เพราะหน้าเช็กอินใช้ `navbar-staff.html`/`navbar.css` อยู่แล้ว)

## ต่อยอด (ยังไม่ได้ทำ)
- เชื่อมต่อ API จริงแทน mock data
- สแกน QR จริง (ตอนนี้เป็นแค่กรอบตกแต่ง)
- แยกสไตล์เป็น CSS Modules ถ้าจะเพิ่มหน้าใหม่ที่มีชื่อ class ชนกันอีกในอนาคต
