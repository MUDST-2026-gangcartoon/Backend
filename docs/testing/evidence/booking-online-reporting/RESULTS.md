# QA รอบ 02 — ผลตรวจจริง

- วันที่: 2026-11-02 (Asia/Bangkok)
- Repository: MUDST-2026-gangcartoon/Backend
- QA branch: `test/booking-online-reporting`
- Base branch: `origin/feat/backend-booking-online-reporting`
- Base commit: `bc7714b` (Skeleton)
- JDK: Eclipse Temurin 21.0.10
- เพิ่ม test ใหม่ 7 ไฟล์ และแก้ test/fixture เดิม 5 ไฟล์ ตาม Qafile
- ตรวจเนื้อหาครบ 12 ไฟล์ตรงกับ MANIFEST SHA-256 เมื่อปรับ line endings เป็นแบบเดียวกัน
- ไม่มีการแก้ production code หรือปิด tests
- ผู้ใช้อนุญาตให้ commit/push ภายหลัง โดยใช้ข้อความจาก `commit-01-tests/COMMIT_MESSAGE.txt`

## ผลทดสอบ

**COMPILE_RED — Exit code 1**

Production compile ไม่ผ่าน: `Registration.java` บรรทัด 73, 87, 104 และ `PageView.java` บรรทัด 34 อ้างถึง `com.eventhub.service.EventClock` ซึ่งยังไม่มีใน base commit นี้ จึงยังไม่ถึง test compilation หรือ execution ไม่มีผล assertion หรือจำนวน test ที่ผ่านให้รายงาน Integration และ regression ยังไม่ถูกรัน

หลักฐานเต็ม: [qa-red-output.txt](qa-red-output.txt)

คำสั่งที่รันจาก `backend/` ด้วย JDK 21:

```sh
sh ./mvnw clean verify -Duser.timezone=Asia/Bangkok \
  -Dtest=StaffControllerHttpTests,EventClockTests,EventRulesTests,EventServiceTests,EventStaffServiceTests \
  -Dit.test=BookingSchemaUpgradeIT,AuditFixesIT,BookingRulesIT,CheckinSourceIT,MockPaymentFlowIT,OnlineTicketsIT \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dfailsafe.failIfNoSpecifiedTests=false
```

## ข้อสังเกตที่ต้องส่งต่อ Backend

1. Base commit ขาด `EventClock` ทำให้ build หยุดก่อน tests ต้องเติม Skeleton ให้ compile ได้ก่อนเก็บ assertion RED
2. ไม่พบ `docs/testing/booking-online-reporting-requirements.md` ใน base commit จึงอ่านสำเนา `Qafile/02__test__booking-online-reporting/QA_REQUIREMENTS.md` ตามที่ README ระบุ โดยไม่คัดลอก requirements ซ้ำ
3. [TEST_CASES.md](TEST_CASES.md) เป็น mapping ที่คัดลอกมาจาก QA package เดิม ตาราง scenario บาง BOOK ID ไม่ตรงเลขใน QA_REQUIREMENTS เช่น BOOK-003 ในตารางเป็น Free booking แต่ใน requirements เป็น Event Status Boundary ควรยึด QA_REQUIREMENTS เป็นหลักเมื่ออ้าง Requirement ID
4. ผล PASS/RED ใน `Qafile/VALIDATION.md` มาจากสำเนา Backend อีกชุด จึงใช้ยืนยันผลของ Git base นี้ไม่ได้

## ขั้นต่อไป

หลัง Backend เติม Skeleton/Implementation ให้รันคำสั่งข้างบนอีกครั้ง แล้วรัน `sh ./mvnw clean verify -Duser.timezone=Asia/Bangkok` สำหรับ full regression ก่อนสรุป GREEN โดยไม่เปลี่ยน expected result ให้ตรงกับ bug
