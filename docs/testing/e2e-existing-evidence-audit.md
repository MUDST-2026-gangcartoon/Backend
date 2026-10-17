# รายงานตรวจสอบความครบถ้วนของหลักฐาน Manual E2E — EventHub

**โครงการ:** EventHub — Gangcartoon  
**ฝ่ายรับผิดชอบ:** Quality Assurance (QA)  
**บทเรียนอ้างอิง:** Week 7 — End-to-End Testing  
**วันที่ปรับปรุง:** 17 ตุลาคม 2569  
**ขอบเขตการตรวจ:** โครงสร้างโฟลเดอร์ รายชื่อภาพหลักฐาน เอกสาร Test Cases และความสอดคล้องกับข้อกำหนดที่ QA/PM ระบุ  
**ข้อจำกัด:** การพบชื่อไฟล์ Screenshot ไม่ใช่การยืนยัน HTTP Status, Execution Duration หรือ Test Result ภายในภาพ รายงานนี้ไม่เปลี่ยน Status ของ Manual E2E โดยอัตโนมัติ และไม่สร้างผลการทดสอบขึ้นมาใหม่

## 1. ที่มาของหลักฐานและเอกสารเดิม

โปรเจกต์จัดเก็บหลักฐาน Manual E2E ใน `docs/Screenshot_test_E2E/` แยกตาม Test ID ตั้งแต่ E2E-001 ถึง E2E-008 และมี PDF รายงานในโฟลเดอร์ `EventHub — E2E Test Plan & Coverage` โดยมีเอกสารดังนี้:

1. `EventHub — E2E Test Plan & Coverage - E2E Test Cases.pdf`
2. `EventHub — E2E Test Plan & Coverage - E2E Coverage Summary.pdf`
3. `EventHub — E2E Test Plan & Coverage - Test Environment.pdf`
4. `EventHub — E2E Test Plan & Coverage - QA Final Verification.pdf`

นอกจากนี้ยังมี `docs/screenshot_test_evidence/` เก็บภาพ QA/CI/JaCoCo และ RED → GREEN จากงานทดสอบเดิม **ไม่ได้ลบหรือสร้างไฟล์เหล่านี้ทับ**

## 2. สรุป Screenshot Evidence เดิม

| Test ID | สถานการณ์ | จำนวน Screenshot ที่พบ | หลักฐานในชื่อไฟล์ | ประเด็นที่ต้องตรวจเพิ่มเติม |
|---|---|---:|---|---|
| E2E-001 | Free Registration | 3 | Before, Registration Success Response, Free Ticket QR | ตรวจยอด 0 บาทและ Ticket Code จริง |
| E2E-002 | Paid Ticket Checkout | 4 | Before, Checkout Summary, HTTP 201, No Ticket | ตรวจ `PENDING_PAYMENT`, จำนวนและยอดจริง |
| E2E-003 | Confirm Payment | 3 | HTTP 200, Confirmed UI, Confirmed Ticket | ตรวจ Payment ID และ Registration เดียวกัน |
| E2E-004 | Staff Check-in | 3 | Ticket Before, Staff Page, Check-in Success | ตรวจ Code เดียวกันและค่า `checkedInAt` |
| E2E-005 | Cancel Registration | 3 | Before Cancel, After Cancel HTTP 204, Payment History | **ไม่พบภาพยืนยันการทดลอง STAFF Check-in ด้วย Ticket Code ที่ยกเลิกแล้ว** |
| E2E-006 | Payment Authorization | 3 | Guest 401, Non-owner 404, Owner 200 | **ไม่พบหลักฐาน ADMIN 403 และ STAFF 403** ตามขั้นตอนที่กำหนด |
| E2E-007 | Payment Expiration | 4 | Before Expiration, EXPIRED, Confirm 409, No Ticket | ตรวจ Payment ID เดียวกันทุกขั้น |
| E2E-008 | Idempotent Confirmation | 3 | Before Repeat, Repeat Confirm, No Duplicate Ticket | ตรวจ Registration ID/Ticket Code เดิมและจำนวนรายการ |

**รวมที่พบจากรายชื่อไฟล์:** Screenshot 26 ไฟล์ใน 8 โฟลเดอร์ และ PDF รายงาน 4 ไฟล์

### หมายเหตุสำหรับ E2E-005 และ E2E-006

การพบหลักฐานบางส่วนไม่เพียงพอสำหรับการสรุป PASS หาก Expected Result ต้องตรวจมากกว่านั้น:

- **E2E-005:** หลัง Cancel Registration ต้องพิสูจน์ว่าตั๋วเดิมใช้ Check-in ไม่ได้ และประวัติ Payment ยังคงอยู่
- **E2E-006:** ต้องตรวจ Role ตามที่ระบุจริง ได้แก่ Guest 401, ADMIN 403, STAFF 403, USER ผู้เป็นเจ้าของ 200 และ USER ผู้อื่น 404

การตรวจที่ยังขาดควรเพิ่มหลักฐานเฉพาะขั้นตอนที่ขาด ไม่จำเป็นต้องสร้าง Test Case ใหม่ซ้ำ

## 3. ตรวจความครบถ้วนของ Test Case ตาม Week 7

Test Case ที่ส่งให้อาจารย์ควรมีข้อมูลต่อไปนี้:

| ข้อมูลบังคับหรือแนะนำ | เอกสาร Manual E2E เดิม | แนวทางดำเนินการ |
|---|---|---|
| Test Case ID | มีคอลัมน์ Test ID | ใช้รหัส E2E-001 ถึง E2E-008 เดิม |
| Title / Scenario | มี Feature / สถานการณ์ทดสอบ | ใช้ชื่อให้ชัดเจน |
| Preconditions | มี | ตรวจว่าตรงกับสภาพแวดล้อมและข้อมูลจริง |
| Test Steps | มี | ต้องทำตามขั้นตอนครบ |
| Input Data | **ยังไม่มีคอลัมน์แยก** ตามโครงสร้าง Sheet ที่ QA ส่งมา | เพิ่มข้อมูล Event, Role, Ticket, Quantity/Price และ Payment ID ที่ไม่เป็นความลับ |
| Expected Result | มี | อ้างอิง Business Rules |
| Actual Result | มีคอลัมน์ | ต้องเป็นผลจากการทดสอบจริง ไม่ใช่ข้อความสมมติ |
| PASS / FAIL | มี Status | แสดงเฉพาะสถานะที่ยืนยันจากหลักฐาน |
| Execution Duration | **ยังไม่มีคอลัมน์แยก** | เพิ่มเวลาที่ใช้จริงจาก Log/Report |
| Test Date / Environment | **ยังไม่มีคอลัมน์แยก** | ระบุวันเวลา Browser, Frontend/Backend/DB และโปรไฟล์ |
| Screenshot / Video / Log | มี Evidence | ใส่ชื่อไฟล์หรือ URL ที่เปิดได้ |
| Commit SHA | **ยังไม่มีคอลัมน์แยก** | บันทึก SHA ของ Code ที่ทดสอบ ถ้ามีไฟล์แก้ไม่ Commit ให้ระบุ `uncommitted working tree` |

การระบุว่า Manual E2E “8 Passed / 100%” ทำได้ก็ต่อเมื่อ Actual Result, Status และ Evidence ของทุกแถวตรงกันจริง การมี PDF Summary 100% อย่างเดียวไม่ใช่หลักฐานว่าได้ตรวจทุกเงื่อนไขครบ

## 4. ความแตกต่างระหว่าง Manual E2E และ Automated Browser E2E

| ประเภท | จุดประสงค์ | หลักฐาน |
|---|---|---|
| Manual E2E (E2E-001–008) | QA ใช้ Browser ตรวจขั้นตอนและผลจริง | Test Case Sheet, Screenshot และ PDF เดิม |
| Automated Browser E2E (Playwright) | ระบบคลิก UI จริงและตรวจ Assertions อัตโนมัติ | `e2e/tests/*.spec.mjs`, HTML/JUnit Report, Trace |
| Integration Tests (Maven Failsafe) | ตรวจ Service/Repository/Database | Test Reports และ CI Runs |
| Kubernetes Smoke Test | ตรวจ Deploy, Health, HTTP API เบื้องต้น | Minikube Workflow Logs |

**ต้องแยกตัวเลข Pass Rate ของแต่ละประเภท** และไม่นำ 1/1 จาก Local Playwright มาสรุปแทน Manual 8/8 หรือ Automated Suite 10/10

## 5. ข้อมูลที่ยืนยันแล้วกับข้อมูลที่ยังขาด

**ยืนยันจาก Output ที่ผู้ทดสอบส่งมา:**
```text
E2E-AUTO-001: Paid Checkout → Confirm → My Tickets → Staff Check-in
1 passed (12.2s)
```
ผลนี้เป็น Local Playwright P0 เวอร์ชันก่อนเพิ่ม Tests ใหม่ การรัน Browser ชุดใหม่ทั้งหมด 10 เคสยังต้องทำเพิ่ม

**ยังต้องตรวจหรือบันทึก:**
- รายละเอียดภาพของ Manual E2E-005/006 ตาม Acceptance Criteria
- Input Data, Duration, Test Date/Environment และ Commit SHA ของ Manual Case ที่ยังไม่มี
- Automated Suite 10 เคสหลังขยาย Script ว่าผ่านกี่เคส ใช้เวลาเท่าใด
- GitHub Actions Workflow ใหม่ว่า Pass จริงหรือไม่ และดาวน์โหลด Artifact ได้หรือไม่

## 6. Checklist ก่อนส่งให้อาจารย์

- [ ] เปิด PDF Test Cases และ Coverage Summary ตรวจตัวเลขให้สอดคล้องกัน
- [ ] ตรวจผลการทดสอบ Manual ตาม Expected Result ทุกขั้นตอน ไม่ดูแค่ชื่อภาพ
- [ ] เพิ่ม/อ้างอิงหลักฐาน E2E-005 ที่ STAFF เช็กอินตั๋วที่ยกเลิกแล้วไม่ได้
- [ ] เพิ่ม/อ้างอิงหลักฐาน E2E-006 ของ ADMIN/STAFF ที่ถูกปฏิเสธ
- [ ] ระบุ Input Data, Duration, วันที่ทดสอบ, Environment และ SHA
- [ ] รัน Playwright 10 เคสบน Fresh E2E Database และเก็บ HTML/JUnit Report
- [ ] ให้ทีม CI/CD รัน Workflow ใหม่หลังได้รับอนุญาต โดยต้องมี Run URL และ Artifact
- [ ] ปิดบัง Cookie, Password, Tokens และข้อมูลส่วนตัวใน Screenshot/Trace

## 7. สรุปสำหรับนำเสนอ

> ทีม QA มี Test Cases แบบ Manual 8 เคสและเก็บหลักฐานแยกเป็นชุดตามรหัสทดสอบ นอกจากนี้ยังพัฒนา Automated Browser E2E ด้วย Playwright เพื่อทดสอบตั้งแต่ UI จนถึง Database จริง โดยการทดสอบอัตโนมัติช่วยสร้างผล Pass/Fail และ Duration ที่ตรวจสอบย้อนหลังได้ ส่วนข้อจำกัดและผลที่ยังไม่ได้ Execute จะรายงานแยกอย่างตรงไปตรงมา

**เอกสารนี้เป็นผล Audit และรายการตรวจสอบ ไม่ใช่ใบรับรองว่า Manual หรือ Automated E2E ทั้งหมด PASS**
