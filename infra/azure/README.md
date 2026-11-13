# EventHub บน Azure VM

K3s รัน Frontend และ Spring Boot ใน namespace `eventhub` และให้ Traefik รับ HTTPS หน้าเว็บใช้ `/api` และ `/uploads` จากโดเมนเดียวกัน H2 และรูปที่อัปโหลดอยู่ใน PVC เดียวกัน Backend ใช้หนึ่ง replica และหยุด Pod เดิมก่อนเปิด Pod ใหม่เพื่อให้ H2 มีผู้เขียนเพียงตัวเดียว

1. ตั้ง DNS label ให้ Public IP ของ Azure และเปิด TCP 80/443 ใน NSG สำหรับเว็บและ ACME HTTP-01 คง SSH สำหรับผู้ดูแล
2. ติดตั้ง K3s พร้อม Traefik, local-path และ secrets encryption แล้วติดตั้ง cert-manager ตามคู่มือ upstream ตรวจว่า node พร้อมใช้งาน
3. สร้าง namespace ด้วย `sudo k3s kubectl apply -f infra/azure/namespace.yaml` แล้วสร้าง Secret ชื่อ `eventhub-runtime` จากไฟล์ env ส่วนตัวที่มีสิทธิ์อ่านเฉพาะเจ้าของ ใช้ฐาน H2 ใหม่สำหรับเดโมคลาวด์

```bash
sudo k3s kubectl -n eventhub create secret generic eventhub-runtime \
  --from-env-file=/path/to/private/eventhub-runtime.env
```

ตั้งตัวแปรในไฟล์ส่วนตัวดังนี้

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | บัญชี H2 ใช้ค่าเดิมทุกครั้งหลังสร้างไฟล์ฐานข้อมูล |
| `APP_DEMO_ADMIN_PASSWORD`, `APP_DEMO_STAFF_PASSWORD`, `APP_DEMO_FIXTURE_PASSWORD` | รหัสแยก 3 ค่า อย่างละ 16–72 ตัว สำหรับ Admin, Staff และ User ตัวอย่าง |
| `SPRING_MAIL_HOST=mailpit`, `SPRING_MAIL_PORT=1025` | SMTP สำหรับซ้อม OTP ในคลัสเตอร์ |
| `APP_GUEST_SMTP_AUTH=false`, `APP_GUEST_SMTP_STARTTLS_ENABLE=false`, `APP_GUEST_SMTP_STARTTLS_REQUIRED=false` | ใช้กับ Mailpit ภายในคลัสเตอร์ |
| `APP_GUEST_VERIFICATION_FROM` | ตั้งผู้ส่ง OTP เช่น `no-reply@eventhub.test` สำหรับ Mailpit |

ครั้งแรกตั้ง `SPRING_JPA_HIBERNATE_DDL_AUTO=update` ใน Secret เพื่อสร้าง schema บน PVC ใหม่ หลัง rollout สำเร็จให้ลบตัวแปรนี้จาก Secret แล้ว restart Backend เพื่อกลับไปใช้ `validate` จากโปรไฟล์ `prod` หากนำ H2 เดิมมาใช้ ให้สำรองข้อมูลและตรวจคู่มือ migration ก่อน

เปิด Mailpit จาก SSH ด้วย `sudo k3s kubectl -n eventhub port-forward svc/mailpit 8025:8025` แล้วใช้ SSH local forwarding พอร์ต 8025 เพื่อเปิดจากเครื่องผู้พรีเซนต์ Grafana ใช้วิธีเดียวกันกับ service `grafana` พอร์ต 3000
