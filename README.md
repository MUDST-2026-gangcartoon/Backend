# EventHub — Event Registration & Management Platform

**EventHub** เป็นเว็บแอปพลิเคชันสำหรับค้นหาและจัดการกิจกรรม ลงทะเบียนรับบัตร ดูตั๋วอิเล็กทรอนิกส์ และตรวจสอบผู้เข้าร่วมงานด้วยระบบ Check-in พัฒนาสำหรับโครงงาน **Phase 1** โดยใช้ React, Spring Boot, GitHub Actions, Docker และ Kubernetes (Minikube)

> **สำคัญ:** ระบบชำระเงินของ EventHub เป็น **Mock Payment** เพื่อจำลองขั้นตอน Checkout/Confirm เท่านั้น **ไม่มีการรับเงินจริง ไม่เชื่อมต่อธนาคารหรือ Payment Gateway** และ QR สำหรับ Mock Payment ไม่ใช่ QR สำหรับโอนเงิน
>
> **ขอบเขตของการ Deploy:** Kubernetes ที่อธิบายใน Repository นี้เป็น **E2E/Test Environment บน Minikube** ไม่ใช่ Production Deployment ที่เปิดให้บริการถาวร

## Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure & Architecture](#3-repository-structure--architecture)
4. [Prerequisites](#4-prerequisites)
5. [Quick Start: Clone and Run Locally](#5-quick-start-clone-and-run-locally)
6. [Demo Accounts and Application Pages](#6-demo-accounts-and-application-pages)
7. [Core Business Flows](#7-core-business-flows)
8. [API Overview](#8-api-overview)
9. [Automated Tests and Coverage](#9-automated-tests-and-coverage)
10. [GitHub Actions / Pipeline as Code](#10-github-actions--pipeline-as-code)
11. [Docker and Kubernetes / Minikube](#11-docker-and-kubernetes--minikube)
12. [Browser E2E Test and Evidence](#12-browser-e2e-test-and-evidence)
13. [Configuration and Data Safety](#13-configuration-and-data-safety)
14. [Troubleshooting](#14-troubleshooting)
15. [Project Resources and Phase 1 Review](#15-project-resources-and-phase-1-review)

---

## 1. Project Overview

EventHub ช่วยให้ผู้จัดงาน ผู้เข้าร่วม และเจ้าหน้าที่หน้างานทำงานผ่านระบบเดียวกัน โดยแบ่งการใช้งานตามสิทธิ์:

| Role | Main Features |
| --- | --- |
| **USER** | ดู/ค้นหากิจกรรม, ดูรายละเอียด, ลงทะเบียนบัตรฟรี, ใช้ Mock Payment สำหรับบัตรเสียเงิน, ดูการลงทะเบียนและ QR Ticket, ยกเลิกการลงทะเบียน |
| **ADMIN** | จัดการกิจกรรมและ Ticket Types, Capacity, รายการผู้เข้าร่วม และ Dashboard/Analytics |
| **STAFF** | ดูรายชื่อผู้เข้าร่วม, เช็กอินด้วย QR Ticket หรือ Ticket Code, ดูรายการ Check-in ล่าสุด |

คุณลักษณะที่เกี่ยวข้อง: Session Authentication, Role-based Authorization, CSRF Protection, การตรวจ Capacity, การออก Ticket Code, การจำลอง Payment และการป้องกันการยืนยันการชำระเงินซ้ำ

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router |
| Backend | Java 21, Spring Boot 4.1.1, Spring Web MVC, Spring Security |
| Data Access | Spring Data JPA / Hibernate |
| Database (Development/Testing) | H2 Database |
| Backend Build / Tests | Maven Wrapper, JUnit 5, Mockito, Spring Boot Test, MockMvc, Maven Surefire/Failsafe |
| Frontend Build | Node.js 20, npm |
| CI | GitHub Actions (GitHub-hosted Ubuntu Runner) |
| Container | Docker, Nginx, Eclipse Temurin Java Runtime |
| Kubernetes | Minikube, Deployment, Service, ConfigMap, Secret, Ingress, Health Probes |
| Code Coverage | JaCoCo (การใช้งานจริงต้องตรวจ Report/Artifact ที่สร้างได้; ดูหัวข้อ 9) |

## 3. Repository Structure & Architecture

โครงสร้างหลักของ Repository:

```text
Backend/                         # Repository root
├── backend/
│   ├── src/main/java/com/eventhub/
│   │   ├── config/              # Security, development/E2E seeders
│   │   ├── controller/          # REST API controllers
│   │   ├── dto/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/             # Business logic
│   ├── src/main/resources/      # application profiles
│   ├── src/test/java/com/eventhub/
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
├── infra/
│   ├── minikube/
│   │   ├── docker/
│   │   ├── e2e/                 # Kubernetes manifests
│   │   └── scripts/             # start/reset/stop
│   └── README.md
├── docs/
│   ├── ci/
│   ├── development/
│   └── testing/
├── .github/workflows/
│   ├── docker-image.yml
│   └── minikube-e2e.yml
└── README.md
```

Logical Architecture:

```text
                         Browser
                            |
           +----------------+----------------+
           |                                 |
       Local Dev                         Minikube
       Vite :5173                    Ingress / Nginx :80
           |                                 |
           +---------- /api/* ---------------+
                            |
                    Spring Boot :8080
                    Auth / Events / Admin
                    Payment / Registration
                    Staff Check-in / Analytics
                            |
                       JPA / Hibernate
                            |
                   H2 (dev/test/e2e profile)
```

ใน Local Development, Vite ส่งคำขอ `/api` และ `/uploads` ไปยัง `http://localhost:8080` ตาม `frontend/vite.config.js`; สำหรับ Container Frontend ใช้ Nginx Reverse Proxy ติดต่อ Backend Service ภายใน Kubernetes

## 4. Prerequisites

การรัน Local ต้องมี:

- **Java JDK 21** (`java -version`)
- **Node.js 20** และ npm (`node -v`, `npm -v`)
- **Git** (`git --version`) หรือดาวน์โหลด ZIP จาก GitHub
- Browser เช่น Chrome หรือ Edge
- Internet สำหรับดาวน์โหลด Dependencies ในครั้งแรก

**ไม่จำเป็นต้องติดตั้ง Maven แยก** เพราะมี `mvnw` / `mvnw.cmd` และ **ไม่จำเป็นต้องติดตั้ง Database Server** สำหรับการรันด้วย `dev` profile เพราะใช้ H2 แบบ File-based

Kubernetes ต้องติดตั้ง Docker, Minikube, `kubectl`, OpenSSL เพิ่มเติม รวมทั้งตั้งค่า Local Images, Secrets และ Hostname ตาม [Infrastructure Guide](infra/README.md)

## 5. Quick Start: Clone and Run Locally

> วิธีนี้แนะนำสำหรับอาจารย์ที่ต้องการตรวจ Source Code และทดลองใช้งาน EventHub บนเครื่องส่วนตัว **ไม่ต้องใช้ Docker/Kubernetes**

### 5.1 Clone the repository

เปิด PowerShell หรือ Terminal:

```bash
git clone https://github.com/MUDST-2026-gangcartoon/Backend.git
cd Backend
```

ถ้าใช้ **Download ZIP** ให้แตกไฟล์และเปิด Terminal ที่ Root Folder ซึ่งมี `backend/` และ `frontend/` อยู่ภายใน

### 5.2 Start Backend (Terminal 1)

**Windows PowerShell:**

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

**macOS / Linux / Bash:**

```bash
cd backend
chmod +x mvnw
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

รอจน Spring Boot เริ่มทำงานแล้วตรวจ URL:

- **Health:** http://localhost:8080/actuator/health — คาดหวัง JSON ที่มี `"status": "UP"`
- **Events API:** http://localhost:8080/api/events — คาดหวัง JSON ของ Event List (อาจยังไม่มี Event ใน Database ใหม่)

**ต้องระบุ `dev` profile** เพราะแอปไม่ได้เปิด Profile นี้ให้อัตโนมัติ

### 5.3 Start Frontend (Terminal 2)

เปิด Terminal ใหม่ที่ **Repository Root** (โฟลเดอร์ระดับเดียวกับ `backend/`):

```powershell
cd frontend
npm ci
npm run dev
```

เปิด URL ที่ Vite แสดง เช่น **http://localhost:5173/** หากพอร์ตถูกใช้งาน Vite อาจเลือกพอร์ตอื่น ให้ใช้ URL จาก Terminal จริง

Backend และ Frontend ต้องเปิดพร้อมกันเพื่อใช้งานระบบที่เรียก Backend API

### 5.4 Stop

กด `Ctrl + C` ใน Terminal ทั้งสองหน้าต่าง

**หมายเหตุเรื่องข้อมูล:** `dev` profile ใช้ H2 แบบ File-based ที่ `backend/data/eventhub` (เมื่อเริ่มแอปจาก `backend/`) การหยุดแอปไม่ได้หมายความว่าข้อมูลจะถูกลบ ห้ามลบไฟล์ Database เพื่อ Reset โดยไม่สำรองหรือไม่ได้รับอนุญาต

## 6. Demo Accounts and Application Pages

### 6.1 Local Demo Accounts (`dev` profile only)

`DevAccountSeeder` สร้างบัญชีสำหรับ Development หากยังไม่มีอีเมลดังกล่าวใน Database

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@example` | `11111111` |
| STAFF | `staff@example` | `11111111` |
| USER | `user@example` | `11111111` |

**บัญชีเหล่านี้ใช้เฉพาะ Local Demo ห้ามใช้ใน Public/Production Environment** Seeder ไม่เขียนทับ Role หรือ Password ของบัญชีที่มีอยู่แล้ว ดังนั้นหากเคยรันระบบและแก้ Password ไปก่อนหน้า ต้องใช้ Password ที่มีอยู่จริง

รายละเอียด: [`docs/development/dev-account-seeder.md`](docs/development/dev-account-seeder.md)

> **หมายเหตุสำหรับผู้ตรวจ:** `frontend/README.md` เป็นเอกสาร Frontend รุ่นก่อนที่ยังมีชื่อ EventFest และตัวอย่างบัญชีแบบ Mock (`*@test.com`) ซึ่ง **ไม่ใช่บัญชีสำหรับ Backend ปัจจุบัน** หากต้องการรัน EventHub แบบเชื่อมต่อทั้ง Frontend/Backend ให้ใช้วิธี Setup และตาราง `dev` Accounts ใน README หลักฉบับนี้เป็นหลัก

### 6.2 Main Frontend Routes

| Function | Route |
| --- | --- |
| Home / Upcoming Events | `/` |
| Event Details | `/event-detail/:eventId` |
| My Registrations | `/MyRegistrationsPage` |
| My Tickets | `/MyTicketsPage` |
| Admin Dashboard | `/admin/dashboard` |
| Manage Events | `/manage-events` |
| Staff Event Selection | `/staff/checkin` |
| Staff Check-in | `/staff/checkin/:eventId` |

Admin และ Staff Routes มีการตรวจ Session และ Role; ถ้ายังไม่ Login หรือ Role ไม่ถูกต้อง จะไม่สามารถเข้าถึงได้

## 7. Core Business Flows

### 7.1 Free Ticket Flow

```text
USER -> Select Event -> Select free Ticket Type
     -> Register -> Receive Ticket Code / QR Ticket
     -> STAFF Check-in
```

### 7.2 Paid Ticket Flow (Mock Payment)

```text
USER -> Select Event -> Select paid Ticket Type
     -> Mock Checkout (PENDING_PAYMENT)
     -> Mock Confirm (CONFIRMED)
     -> Registration created -> QR Ticket issued
     -> STAFF Check-in
```

หลักการสำคัญของ Mock Payment:

- Checkout สร้างสถานะ `PENDING_PAYMENT` และ **ยังไม่ออก Ticket**
- Pending Payment ไม่จองที่นั่ง และหมดอายุหลัง 10 นาที
- Confirm ตรวจ Capacity, Price, Ownership และความซ้ำซ้อนก่อนสร้าง Registration
- Confirm สำเร็จแล้วออก Registration/Ticket Code หนึ่งชุด การ Confirm ซ้ำต้องไม่ออกตั๋วเพิ่ม
- การยกเลิก Registration ไม่ลบ Payment History
- Ticket ที่ยกเลิกไม่สามารถนำมา Check-in ได้
- **ไม่มีเงินจริงเข้ามาเกี่ยวข้อง**

รายละเอียดเพิ่มเติม: [`docs/development/mock-payment-backend-handoff.md`](docs/development/mock-payment-backend-handoff.md)

## 8. API Overview

Base URL สำหรับ Backend Local: `http://localhost:8080` (Frontend เรียกแบบ Relative Path `/api/...` ผ่าน Proxy)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/events` | List/Search/Filter Events |
| GET | `/api/events/{eventId}` | Event Detail |
| GET | `/api/auth/csrf` | CSRF Token |
| POST | `/api/auth/signup` | Signup |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current User |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/events/{eventId}/registrations` | Free Ticket Registration |
| DELETE | `/api/events/{eventId}/registrations` | Cancel Registration |
| GET | `/api/registrations/me` | My Registrations |
| POST | `/api/payments/mock/checkout` | Create Mock Payment Order |
| POST | `/api/payments/mock/{paymentId}/confirm` | Confirm Mock Payment |
| GET | `/api/payments/mock/{paymentId}` | Payment Status |
| POST | `/api/payments/mock/{paymentId}/cancel` | Cancel Pending Payment |
| GET | `/api/staff/events/{eventId}/attendees` | Staff Attendee List |
| POST | `/api/staff/events/{eventId}/check-in` | Staff Check-in |
| GET | `/actuator/health` | Health Check |
| GET | `/actuator/health/readiness` | Kubernetes Readiness |

**Security:** API ที่เปลี่ยนแปลงข้อมูลใช้ Session/Cookie และ CSRF Protection (`X-CSRF-TOKEN`) ตามการตั้งค่า Spring Security; การเข้าถึง Admin/Staff/Payment ถูกควบคุมด้วย Role ที่ Backend ไม่ใช่เพียงการซ่อนปุ่ม Frontend

## 9. Automated Tests and Coverage

### 9.1 Run all Backend Tests

เปิด Terminal ใน `backend/`:

**Windows:**

```powershell
.\mvnw.cmd clean verify
```

**macOS / Linux:**

```bash
./mvnw clean verify
```

Maven `verify` เรียก Surefire และ Failsafe ตาม `backend/pom.xml` โดย Integration Test Classes ใช้รูปแบบชื่อ `*IT.java`

### 9.2 Test Locations

| Type | Location / Example |
| --- | --- |
| Unit/Service Tests | `backend/src/test/java/com/eventhub/service/` |
| HTTP/Security Tests | `backend/src/test/java/com/eventhub/controller/` |
| Integration Tests | `backend/src/test/java/com/eventhub/integration/` |
| Mock Payment Integration | `backend/src/test/java/com/eventhub/integration/payment/` |
| Test Requirements | [`docs/testing/`](docs/testing/) |

ตัวอย่าง Scenario: Free/Paid Registration, Pending/Confirmed Payment, Session/Role Security, Transaction Rollback และ Concurrency

### 9.3 Test Evidence (GitHub Actions)

หลักฐานจาก GitHub Actions ณ วันที่ 15 ตุลาคม 2026:

- [Main — CI Build/Test/JaCoCo Success (latest verified)](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38820459942)
- [PR — Backend Integration Success](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38779123565)
- [Mock Payment Red Build (test-first)](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38503538767)
- [Mock Payment Green Build](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38505819795)

ใน PR CI ที่อ้างอิงพบ Backend Test Summary **193 ผ่าน** และ Failsafe Integration Tests **15 ผ่าน** โดยต้องตรวจ Log ของ Run ล่าสุดที่ตรงกับ Commit ที่ส่งจริงทุกครั้ง

> **ทำไม Backend Integration (push) ขึ้น Skipped?** Workflow ตั้ง `if: github.event_name == 'pull_request'` สำหรับ **Job ที่แยกชื่อ Backend - Integration** จึง Skipped บน Push ตามเงื่อนไข อย่างไรก็ตาม `Backend - Test and Build` ปัจจุบันรัน `clean verify` ซึ่งรวม Integration Tests แล้ว ไม่ได้หมายความว่า Integration Tests ทุกส่วนถูกข้าม

### 9.4 JaCoCo Coverage — รายงานจริงบน GitHub Actions

JaCoCo Maven Plugin (`prepare-agent` + `report`) ถูกตั้งค่าใน `backend/pom.xml` แล้ว Workflow สั่ง `clean verify` พร้อมตรวจว่ามี `jacoco.exec`, `index.html`, `jacoco.xml` และ `jacoco.csv` ก่อนผ่าน Job

HTML Report จากการรัน Local ที่สำเร็จอยู่ที่:

```text
backend/target/site/jacoco/index.html
```

**หลักฐานที่ตรวจพบ ณ 16 ตุลาคม 2026:** PR #58 รวมการแก้ไข JaCoCo แล้ว และ [Main CI Run `f03b3d50` ผ่าน](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38820459942) โดยมี Artifact ชื่อ `backend-jacoco-f03b3d50e5a793c9f946784733192c58645764da` ให้ดาวน์โหลดเพื่อตรวจ HTML Report จริง

**ยังไม่ระบุเปอร์เซ็นต์ Coverage ใน README** เพราะต้องอ่านค่าจาก Report นั้นโดยตรงก่อน (และต้องแยก Coverage จาก Commit อื่น ๆ ไม่ให้สับสน)

## 10. GitHub Actions / Pipeline as Code

ไฟล์ Workflow อยู่ที่ [`.github/workflows/`](.github/workflows/)

| Workflow | Jobs / Purpose |
| --- | --- |
| [`docker-image.yml`](.github/workflows/docker-image.yml) | Backend Test/JaCoCo Coverage & Build, Frontend Build, Backend Integration (PR job), Docker Image Build |
| [`minikube-e2e.yml`](.github/workflows/minikube-e2e.yml) | Minikube Start, Container Build/Load, Kubernetes Deploy, Health/API Smoke Tests |

การทำงานสำคัญ:

1. GitHub Actions Trigger เมื่อ `push` หรือ `pull_request` ตาม Branch Filter ของแต่ละ Workflow
2. GitHub-hosted Ubuntu Runner ติดตั้ง Java 21 / Node.js 20 และ Dependencies
3. Runner รัน Maven `clean verify` พร้อม JaCoCo, Build Frontend และ Build Docker Images
4. `Backend - Integration` Job แยกต่างหากรันเฉพาะ PR; แต่ `Backend - Test and Build` รัน `clean verify` ซึ่งครอบคลุม Failsafe Integration Tests บน Push ด้วย
5. Minikube Workflow สร้าง Cluster ชั่วคราว, Deploy ระบบ และทำ HTTP Smoke Tests ก่อนลบ Cluster

**ผล Success หมายถึง Workflow ที่กำหนดรันผ่าน** ไม่ได้หมายความว่ามี Production Deployment หรือ Automated Full Browser E2E Test โดยอัตโนมัติ

GitHub Actions: https://github.com/MUDST-2026-gangcartoon/Backend/actions

CI/CD Runbook: [`docs/ci/README.md`](docs/ci/README.md)

> **หมายเหตุเรื่องเวอร์ชัน Workflow:** การตั้งค่าจริงของ CI/CD อาจเปลี่ยนเร็วกว่าเอกสารประกอบบางไฟล์ ให้ยึด `.github/workflows/*.yml` บน Commit ที่กำลังตรวจเป็นแหล่งอ้างอิงหลัก โดยเฉพาะเงื่อนไข `push`/`pull_request`, ขั้นตอน JaCoCo และ Minikube

## 11. Docker and Kubernetes / Minikube

ไฟล์สำคัญ:

```text
backend/Dockerfile
infra/minikube/docker/frontend.Dockerfile
infra/minikube/docker/nginx.conf
infra/minikube/e2e/eventhub-namespace.yaml
infra/minikube/e2e/eventhub-backend-deployment.yaml
infra/minikube/e2e/eventhub-backend-service.yaml
infra/minikube/e2e/eventhub-frontend-deployment.yaml
infra/minikube/e2e/eventhub-frontend-service.yaml
infra/minikube/e2e/eventhub-backend-env.yaml
infra/minikube/e2e/eventhub-ingress.yaml
infra/minikube/scripts/start.sh
infra/minikube/scripts/reset.sh
infra/minikube/scripts/stop.sh
```

### 11.1 Recommended: Verify via GitHub Actions

1. เปิด https://github.com/MUDST-2026-gangcartoon/Backend/actions
2. เลือก **Minikube - Deploy and Smoke Test**
3. เปิด Run ที่สำเร็จ หรือใช้ **Run workflow** หากมีสิทธิ์และ Workflow อนุญาต
4. ดูขั้นตอน Start Minikube, Build/Load Images, Deploy, Rollout และ Verify HTTP Smoke Tests
5. จด **Commit SHA**, Workflow Run URL และผลของแต่ละ Job

[ตัวอย่าง Minikube Deployment/Smoke Test ที่ผ่าน](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38779123640)

Workflow ดังกล่าวใช้ Minikube แบบ **Disposable** บน Runner และเรียก `minikube delete` หลังจบ ไม่ใช่เว็บไซต์สาธารณะที่เปิดไว้ตลอดเวลา

### 11.2 Local Minikube (Advanced)

อ่านคู่มือทั้งหมดที่ [`infra/README.md`](infra/README.md) ก่อนดำเนินการ โดยเฉพาะ Docker Images, TLS และ Kubernetes Secrets

ตัวอย่าง Build Images จาก Repository Root:

```bash
docker build -f backend/Dockerfile -t eventhub-backend:e2e backend/
docker build -f infra/minikube/docker/frontend.Dockerfile -t eventhub-frontend:e2e .
minikube start
minikube image load eventhub-backend:e2e
minikube image load eventhub-frontend:e2e
```

**ก่อน Deploy:** ต้องมี `eventhub-backend-secret` ที่มีค่า `APP_E2E_SEED_PASSWORD` และ `eventhub-local-tls` ใน Namespace `eventhub-e2e`; ให้ทำตาม Pipeline หรือคู่มือ Infra ที่ใช้ Environment ชั่วคราว **ไม่ Commit Secrets/Private Keys ลง Git**

ตัวอย่างการสร้าง Secrets สำหรับ **Minikube ส่วนตัวที่ใช้ทดสอบเท่านั้น** (Bash/WSL/Linux, หลัง `minikube start`; ต้องอยู่บน Kubernetes Context ชื่อ `minikube`):

```bash
kubectl config current-context
kubectl apply -f infra/minikube/e2e/eventhub-namespace.yaml

# ตั้งรหัสทดสอบเอง โดยไม่พิมพ์รหัสผ่านลง Git หรือ Shell History
read -r -s -p "E2E demo password: " E2E_PASSWORD
echo
kubectl -n eventhub-e2e create secret generic eventhub-backend-secret \
  --from-literal=APP_E2E_SEED_PASSWORD="$E2E_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -
unset E2E_PASSWORD

# สร้าง TLS certificate ชั่วคราวสำหรับ eventhub.local
CERT_DIR="$(mktemp -d)"
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 1 \
  -subj "/CN=eventhub.local" \
  -addext "subjectAltName=DNS:eventhub.local" \
  -keyout "$CERT_DIR/tls.key" -out "$CERT_DIR/tls.crt"
kubectl -n eventhub-e2e create secret tls eventhub-local-tls \
  --key="$CERT_DIR/tls.key" --cert="$CERT_DIR/tls.crt" \
  --dry-run=client -o yaml | kubectl apply -f -
rm -f "$CERT_DIR/tls.key" "$CERT_DIR/tls.crt"
rmdir "$CERT_DIR"
```

**ตรวจว่า Context เป็น Minikube จริงก่อนเรียกคำสั่งสร้าง Secret** ห้ามใช้คำสั่งชุดนี้กับ Cluster ที่แชร์กับผู้อื่นหรือ Production การเข้าผ่าน `https://eventhub.local` ยังต้องตั้งค่า Hosts/Ingress Networking ให้ถูกต้องตามเครื่องที่ทดสอบ



เมื่อเตรียม Dependencies, Images, Namespace และ Secrets ครบแล้ว:

```bash
bash infra/minikube/scripts/start.sh
kubectl get deployments,pods,services,ingress -n eventhub-e2e
```

เป้าหมายคือ Backend/Frontend Deployments มีสถานะ Ready และ Health/API ตอบตามที่คาดหวัง การเข้า `https://eventhub.local` ต้องตั้งค่า Local Hostname และ TLS เพิ่มเติม

การ Reset E2E Database จะทำให้ข้อมูลทดสอบสูญหาย ให้ตรวจว่า QA ไม่ได้ทดสอบอยู่ และอ่าน `infra/README.md` / `docs/development/e2e-database-contract.md` ก่อนทุกครั้ง

## 12. Browser E2E Test and Evidence

**Manual Browser E2E** คือการเปิดเว็บจริง ทดสอบตั้งแต่ต้นจนจบตาม Scenario แล้วบันทึก Step, Expected Result, Actual Result, Pass/Fail และ Screenshot/Video

**Automated Browser E2E** คือมี Script เช่น Playwright/Cypress ที่สั่ง Browser คลิก/กรอก/ตรวจผลโดยอัตโนมัติ **ภาพหน้าจอจากการกดเองไม่นับเป็น Automated Browser Test**

ตัวอย่าง Test Plan สำหรับ QA:

| ID | Scenario | Expected Result |
| --- | --- | --- |
| E2E-01 | ADMIN Login → Create Event | Event ปรากฏในรายการ |
| E2E-02 | USER Login → Register Free Ticket | ได้ Registration/Ticket Code |
| E2E-03 | USER Mock Checkout สำหรับ Paid Ticket | สถานะ `PENDING_PAYMENT` และยังไม่มี Ticket |
| E2E-04 | USER Confirm Mock Payment → My Tickets | สถานะ `CONFIRMED`, ได้ Ticket/QR |
| E2E-05 | STAFF ใช้ Ticket Code → Check-in | Check-in สำเร็จ |
| E2E-06 | STAFF Check-in ซ้ำ | ถูกปฏิเสธตาม Business Rule |
| E2E-07 | USER พยายามเปิด Admin | ไม่ได้รับสิทธิ์ |

**หมายเหตุ:** ตารางเป็น **Scenarios สำหรับรัน** ไม่ใช่การยืนยันว่า Test ทั้งหมดผ่านแล้ว ต้องบันทึกผลที่เกิดขึ้นจริงก่อนระบุ Pass

โครงสร้างที่แนะนำเมื่อ QA จัดเก็บหลักฐานใน Repo:

```text
docs/testing/e2e-evidence/
├── README.md                 # Test environment, date, browser, commit SHA
├── test-results.md           # Steps, expected, actual, PASS/FAIL
├── E2E-01-admin-event.png
├── E2E-03-payment-pending.png
├── E2E-04-confirmed-ticket.png
└── E2E-05-staff-checkin.png
```

**ตัวอย่างนี้เป็นรูปแบบที่แนะนำ ยังไม่ได้อ้างว่าไฟล์ Screenshot ทั้งหมดมีอยู่แล้ว** ห้ามใส่ Session Cookie, CSRF Token, Password หรือข้อมูลส่วนบุคคลลงในหลักฐาน

### 12.1 E2E Seed Data

สำหรับ E2E Profile มีข้อมูลตั้งต้นที่เอกสารกำหนดไว้:

- 5 E2E Accounts: ADMIN, STAFF และ USER สำหรับกรณีต่าง ๆ
- 2 Events: `[E2E] Open Workshop` (ยังมีที่นั่ง) และ `[E2E] Full Workshop` (เต็ม)
- 3 Registrations โดยมี 1 รายการที่เช็กอินแล้ว

E2E ใช้ **Dedicated H2 In-memory Database** และ Profile `e2e` เท่านั้น; Password ได้จาก Environment Variable `APP_E2E_SEED_PASSWORD` ไม่ได้ Commit ลง Repo

ดู [`docs/development/e2e-database-contract.md`](docs/development/e2e-database-contract.md)

> หมายเหตุ: Free Ticket ใน Seed Event `[E2E] Full Workshop` มีสถานะเต็มแล้ว หากต้องสาธิตการลงทะเบียน Free Ticket สำเร็จ ต้องใช้ข้อมูลทดสอบเพิ่มเติมใน Environment ที่อนุญาต ไม่ควรอ้างว่า Fixture เดิมรองรับ Happy Path นี้โดยตรง

## 13. Configuration and Data Safety

| Spring Profile | Database / Configuration | Usage |
| --- | --- | --- |
| `dev` | H2 File Database ที่ `backend/data/eventhub` (เมื่อรันจาก `backend/`) | Local Development |
| `test` | Isolated Test Database | Backend Automated Tests |
| `e2e` | H2 In-memory + E2E Seeder | Disposable E2E/Minikube |
| `prod` | External Database จาก Environment Variables | Production-oriented configuration only |

หลักปฏิบัติ:

- **ห้ามใช้ Profile `e2e` หรือ `ddl-auto: create-drop` กับ Database จริง**
- **อย่าเปิดเผยรหัสผ่าน, Session, CSRF Token, Private Key หรือ Real Secrets**
- `prod` Profile ตรวจ Database Schema ด้วย Hibernate `validate`, ไม่ได้จัดเตรียม Production Database ให้เอง
- Backend ใช้ Session และ CSRF Protection; QR Payment ใน Demo ไม่ใช่เงินจริง
- `backend/data/`, `backend/uploads/`, `backend/target/` และ `frontend/node_modules/` ไม่ใช่ Source Code ที่ต้อง Commit

## 14. Troubleshooting

| Problem | Recommendation |
| --- | --- |
| `java` ไม่พบ | ตรวจ JDK 21 และ `JAVA_HOME` |
| Maven Wrapper ใช้ไม่ได้ | ตรวจว่ารันจาก `backend/` และอนุญาตให้ Wrapper ดาวน์โหลด Dependencies |
| Port 8080 ถูกใช้ | ปิด Backend Process ตัวเดิม หรือจัดการพอร์ตให้ตรงกับ Vite Proxy |
| Frontend ขึ้น แต่ API Error | ตรวจว่า Spring Boot รันอยู่ที่ `localhost:8080` และ Vite Proxy `/api` ถูกต้อง |
| Vite เปลี่ยน Port | ใช้ URL ที่ Terminal แสดงจริง เช่น 5174 |
| Demo Login ไม่ผ่าน | ตรวจ `dev` Profile; `DevAccountSeeder` ไม่ Reset Password ของบัญชีเดิม |
| HTTP 401/403 | ตรวจ Login Session, Role และ CSRF Token |
| Integration Job ถูก Skipped ตอน Push | Job แยกนี้รันเฉพาะ PR; `Backend - Test and Build` ปัจจุบันรัน `clean verify` รวม Integration Tests |
| Coverage Report ไม่เกิด | ตรวจ JaCoCo `prepare-agent`, `jacoco.exec` และ Workflow Artifacts |
| Minikube ไม่ Ready | ตรวจ Images, Secrets, Pods, Deployments และ Logs ใน GitHub Actions |
| Browser QR Scanner ไม่อ่าน | ตรวจ HTTPS/localhost, Camera Permission, QR Decoder และ API Response |

## 15. Project Resources and Phase 1 Review

### Source & Version Control

- **GitHub Repository:** https://github.com/MUDST-2026-gangcartoon/Backend
- [Commits](https://github.com/MUDST-2026-gangcartoon/Backend/commits/main/)
- [Pull Requests](https://github.com/MUDST-2026-gangcartoon/Backend/pulls?q=is%3Apr)
- [Contributors](https://github.com/MUDST-2026-gangcartoon/Backend/graphs/contributors)
- **Figma Resource (provided by the team):** https://www.figma.com/design/ujYLiJeOi3180MCedd7P8j/petopia?node-id=0-1&t=NxHA4TLPUuaztVz6-1

### Technical Documentation

- [Frontend Readme](frontend/README.md)
- [Dev Account Seeder](docs/development/dev-account-seeder.md)
- [E2E Database Contract](docs/development/e2e-database-contract.md)
- [Mock Payment Backend Handoff](docs/development/mock-payment-backend-handoff.md)
- [Event Service Test Requirements](docs/testing/event-service-requirements.md)
- [Mock Payment Test Requirements](docs/testing/mock-payment-requirements.md)
- [CI/CD Runbook](docs/ci/README.md)
- [Infrastructure Runbook](infra/README.md)

### Evidence for Phase 1

| Review Topic | Where to Check |
| --- | --- |
| Project Overview / Download / Run | Sections 1–6 of this README |
| Git Contributions | GitHub Commits, PRs, Contributors |
| Unit & Integration Tests | `backend/src/test/`, Maven `clean verify`, GitHub Actions Logs |
| Test Coverage | [Main CI — JaCoCo Artifact](https://github.com/MUDST-2026-gangcartoon/Backend/actions/runs/38820459942) |
| Pipeline as Code | `.github/workflows/docker-image.yml` และ `.github/workflows/minikube-e2e.yml` |
| Docker / Kubernetes | `backend/Dockerfile`, `infra/minikube/e2e/` |
| CI/CD Deploy Evidence | `.github/workflows/minikube-e2e.yml`, GitHub Actions Deploy Run |
| Browser E2E Evidence | QA Test Case Results / Screenshots เมื่อทดสอบจริงแล้ว |

> **Before Evaluation:** โปรดใช้ Commit บน `main` ที่ตรงกับเวอร์ชันส่งงาน ตรวจ GitHub Actions Run ล่าสุด และทดลองทำตาม Quick Start จาก **Fresh Clone** ก่อนส่งให้ผู้ตรวจ โค้ด Build ผ่าน CI เป็นหลักฐานสำคัญ แต่ไม่ทดแทนการตรวจ Local Setup, Manual Browser E2E และ Coverage Report ได้ทั้งหมด

---

**Team: Gangcartoon**  
**Project: EventHub — Phase 1**
