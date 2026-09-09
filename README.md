# Frontend – Usage Guide

## 1. Requirements

ก่อนเริ่มใช้งาน ตรวจสอบว่ามีโปรแกรมต่อไปนี้ติดตั้งในเครื่อง

* Node.js
* npm
* Web Browser เช่น Google Chrome

ตรวจสอบเวอร์ชันด้วยคำสั่ง:

```bash
node -v
npm -v
```

---

## 2. Installation

แตกไฟล์โปรเจกต์และเปิด Terminal ที่โฟลเดอร์โปรเจกต์

ติดตั้ง dependencies:

```bash
npm install
```

---

## 3. Start the Development Server

รันโปรเจกต์ด้วย:

```bash
npm run dev
```

หลังจากรันสำเร็จ Terminal จะแสดง URL สำหรับเข้าเว็บไซต์ เช่น:

```text
http://127.0.0.1:5173/
```

เปิด URL นี้ใน Web Browser

---

## 4. User Roles

ระบบมี Mock User สำหรับใช้ทดสอบการทำงานของแต่ละ Role

### General User

```text
Email: user@test.com
Password: 1234
Role: User
```

General User สามารถใช้งานส่วนหน้าบ้านและค้นหา Event ได้

### Admin

```text
Email: admin@test.com
Password: 1234
Role: Admin
```

Admin สามารถเข้าถึงหน้า Dashboard และ Manage Events

### Staff

```text
Email: staff@test.com
Password: 1234
Role: Staff
```

Staff สามารถใช้งานส่วน Check-in ได้

> หมายเหตุ: Account เหล่านี้เป็น Mock Account สำหรับการทดสอบ Frontend เท่านั้น

---

## 5. Main Pages

### Home

```text
/
```

เป็นหน้าหลักสำหรับค้นหาและดู Event

เมื่อกด Logo ระบบจะกลับมาที่หน้าหลัก:

```text
/
```

ผู้ใช้ที่ยังไม่ได้ Login จะไม่ถูกส่งไปยัง Admin Dashboard

---

### Admin Dashboard

```text
/admin/dashboard
```

ใช้สำหรับ Admin ในการดูภาพรวมและจัดการระบบ

หาก User ที่ไม่มีสิทธิ์พยายามเข้าหน้า Admin ระบบจะนำกลับไปยังหน้าที่เหมาะสมแทน

---

### Manage Events

```text
/manage-events
```

ใช้สำหรับจัดการ Event เช่น

* ดูรายการ Event
* สร้าง Event
* แก้ไข Event
* จัดการข้อมูล Event

หน้านี้สำหรับ Role ที่มีสิทธิ์จัดการ Event เท่านั้น

---

### Create Event

สามารถสร้าง Event ใหม่ได้จากหน้า Manage Events

ข้อมูลสำคัญที่ต้องกรอก ได้แก่:

* Event Name
* Location
* Date
* Time
* Maximum Attendees

ระบบจะตรวจสอบข้อมูลก่อน Submit

ตัวอย่างข้อมูลที่ไม่สามารถส่งได้:

```text
Maximum Attendees = -5
```

ระบบจะแสดงข้อความ Error ใกล้กับช่องที่มีปัญหา

---

### Cover Image

ในหน้า Create/Edit Event สามารถเลือก Cover Image จากเครื่องได้

เมื่อเลือกไฟล์ ระบบจะแสดง Preview ของรูปภาพ

นอกจากนี้สามารถใช้ URL ของรูปภาพได้หากต้องการ

---

### Staff Check-in

รูปแบบ URL:

```text
/staff/checkin/:eventId
```

ตัวอย่าง:

```text
/staff/checkin/1
```

Staff สามารถกรอก Check-in Code ของผู้เข้าร่วมงาน เช่น:

```text
GTH-QA001
GTH-QA002
GTH-QA003
```

ระบบจะแสดงจำนวนผู้ที่ Check-in แล้ว และจำนวนที่เหลือ

รายการ Check-in ล่าสุดจะแสดงได้สูงสุด 6 รายการ แต่ยอด Check-in รวมจะนับสะสมทั้งหมด

ตัวอย่าง:

```text
Check-in ทั้งหมด: 7
รายการล่าสุด: 6 รายการ
```

---

## 6. Error / Invalid Routes

หากเปิด Event ID ที่ไม่มีอยู่ เช่น:

```text
/staff/checkin/999
```

ระบบจะแสดงข้อความว่าไม่พบ Event แทนการนำ Event อื่นมาแสดงโดยอัตโนมัติ

หากเปิด URL ที่ไม่มีในระบบ เช่น:

```text
/qa-page-does-not-exist
```

ระบบจะแสดงหน้า:

```text
Page Not Found
```

พร้อมปุ่มสำหรับกลับไปหน้าหลัก

---

## 7. Testing Checklist

สามารถใช้ Checklist นี้สำหรับทดสอบระบบหลังติดตั้ง

### F01 – Home / Logo

1. เปิด:

```text
http://127.0.0.1:5173/
```

2. ตรวจสอบว่าหน้าแรกเป็นหน้าค้นหา Event
3. กด Logo
4. ตรวจสอบว่ากลับมาที่:

```text
/
```

5. ตรวจสอบว่าไม่ได้เข้าสู่ Admin Dashboard โดยอัตโนมัติ

---

### F02 – User Role

1. Login ด้วย:

```text
user@test.com
1234
```

2. เปิด:

```text
/manage-events
```

3. ตรวจสอบว่า User ไม่สามารถเข้าถึงเมนู Admin
4. ตรวจสอบ Navbar ว่าแสดงเมนูตาม Role ของ User

---

### F11 – Invalid Event / Route

ทดสอบ:

```text
/staff/checkin/999
```

ควรแสดง:

```text
Event Not Found
```

จากนั้นทดสอบ:

```text
/qa-page-does-not-exist
```

ควรแสดงหน้า Not Found พร้อมปุ่มกลับหน้าหลัก

---

### F12 – Edit Event Date

1. เปิด:

```text
/manage-events
```

2. เลือก Edit Event
3. เปลี่ยนวันที่เป็น:

```text
2026-10-01
```

4. เปลี่ยนเวลาเป็น:

```text
10:00
```

5. กด Save
6. ตรวจสอบวันที่ในรายการ Event

วันที่ควรแสดงเป็น:

```text
1 October 2026
```

หรือรูปแบบวันที่ตามที่กำหนดใน UI

---

### F13 – Form Validation

1. เปิด Create Event
2. เว้นข้อมูลที่จำเป็นให้ว่าง
3. ใส่ Maximum Attendees เป็น:

```text
-5
```

4. กด Submit

ระบบควรแสดง Error และไม่สร้าง Event

---

### F14 – Cover Image

1. เปิด Create/Edit Event
2. กด Upload Cover Image
3. เลือกรูปภาพจากเครื่อง
4. ตรวจสอบว่ามี Preview รูปภาพ
5. ทดสอบ URL รูปภาพหากต้องการ

---

### F15 – Check-in Count

1. เปิด:

```text
/staff/checkin/1
```

2. Check-in:

```text
GTH-QA001
GTH-QA002
GTH-QA003
GTH-QA004
GTH-QA005
GTH-QA006
GTH-QA007
```

3. ตรวจสอบยอดรวม

ผลที่ควรได้:

```text
Checked in: 7
Remaining: 121
```

รายการล่าสุดจะแสดงเพียง 6 รายการ แต่ยอดรวมต้องเป็น 7

---

## 8. Stop the Development Server

กด:

```text
Ctrl + C
```

ใน Terminal เพื่อหยุด Development Server

---

## 9. Troubleshooting

### npm install มีปัญหา

ลองลบ `node_modules` และติดตั้งใหม่:

```bash
npm install
```

หากมี `package-lock.json` อยู่ ให้ใช้:

```bash
npm ci
```

### Port 5173 ถูกใช้งาน

ตรวจสอบว่ามี Development Server ตัวอื่นกำลังทำงานอยู่หรือไม่ แล้วหยุดด้วย:

```text
Ctrl + C
```

จากนั้นรัน:

```bash
npm run dev
```

### หน้าเว็บไม่อัปเดต

ลอง Refresh Browser หรือ Hard Refresh:

```text
Ctrl + Shift + R
```

---

## 10. Project Notes

โปรเจกต์นี้เป็น Frontend สำหรับระบบจัดการ Event โดยใช้ Mock Data และ Mock Authentication สำหรับการทดสอบการทำงานของ UI และ User Flow

การกำหนดสิทธิ์ในส่วน Frontend มีไว้สำหรับการควบคุมการแสดงผลและ User Experience เท่านั้น ไม่ควรถือเป็นระบบ Security ของ Backend
