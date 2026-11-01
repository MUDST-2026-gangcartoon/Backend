# Test Cases — รอบ 03: Profile และ Password Management

ไฟล์หลัก: `ProfileIT.java`
Fixture: `MockPaymentDbTestSupport`
Framework: JUnit 5, ParameterizedTest, Spring Boot Test, MockMvc และ H2

## Tests ที่มีอยู่ใน payload

| Test ID | Test method | ขั้นตอน/สิ่งที่ตรวจ | Expected Result |
| --- | --- | --- | --- |
| PROF-001/002 | `everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole` | รันกับ Role ทุกค่า, Login สอง session, แก้ name/email, ตรวจ `/api/auth/me`, ID, role และ Registration เดิม | `200`; ID/role/registration owner คงเดิม; email normalized; session ปัจจุบันใช้ได้; session ที่อ้าง email เก่าได้ 401 |
| PROF-003/004/005 | `rejectsWrongPasswordDuplicateEmailAndInvalidEmailWithoutChangingAccount` | ส่ง current password ผิด, email ซ้ำ และ email format ผิด | 400/409 ตามกรณี; email เดิมไม่เปลี่ยน |
| PROF-006/007 | `passwordChangePreservesCurrentSessionAndExpiresOtherSessions` | Login สอง session แล้วเปลี่ยน password ใน session แรก | session แรกใช้ได้; session ที่สองได้ 401; รหัสเดิม Login ไม่ผ่าน; รหัสใหม่ Login ได้ |
| PROF-008 | `passwordValidationRejectsWrongOldSameShortAndOversizedUtf8Passwords` | ทดสอบ current password ผิด, password ใหม่ซ้ำ, สั้น และเกิน 72 UTF-8 bytes | ทุกกรณี 400; password hash เดิมยังใช้ได้ |
| PROF-009 | `profileRequiresLoginAndCsrf` | เรียกแบบ anonymous และ authenticated แต่ไม่ส่ง CSRF | anonymous 401; ไม่มี CSRF 403 |

## Test ที่ควรเพิ่ม

| Test ID | Test | Expected Result |
| --- | --- | --- |
| PROF-010 | ตรวจ CSRF rotation หลัง update | token เก่าใช้กับ request ที่ต้องใช้ CSRF ไม่ได้; token ใหม่ที่ GET จาก `/api/auth/csrf` ใช้ได้ |
| PROF-011 | ตรวจ name boundary | name ว่าง, สั้นกว่า 2 หรือยาวเกิน 100 ตัวอักษรได้ 400 และข้อมูลเดิมคงอยู่ |
| PROF-012 | ตรวจ email boundary | email ว่างหรือเกิน 254 ตัวอักษรได้ 400 และข้อมูลเดิมคงอยู่ |
| PROF-013 | เปลี่ยน email เป็น email เดิมของตัวเอง | ไม่ถูกมองเป็น duplicate; update สำเร็จตาม validation |

## ข้อควรระวัง

- `everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole` เป็น ParameterizedTest; ให้ตรวจผลของ USER, STAFF และ ADMIN แยกกันในรายงาน
- Test ส่ง field `role` ที่พยายามเปลี่ยน role แต่ต้องยืนยันว่า role ที่ตอบกลับยังเป็น role เดิมจากฐานข้อมูล
- การทดสอบ Browser สองตัวต้องใช้ MockHttpSession สองชุด
- Test ปัจจุบันใช้ `.with(csrf())` เพื่อส่ง CSRF ที่ถูกต้อง; วิธีนี้ยังไม่พิสูจน์ว่า token เดิมถูกหมุน/ยกเลิกจริง จึงควรเพิ่ม PROF-010
- การตรวจ 72 bytes ต้องใช้ UTF-8 byte length ไม่ใช่ String.length() อย่างเดียว
- ตรวจ response ว่าไม่มี password หรือ password hash
