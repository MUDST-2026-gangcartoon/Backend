# CI/CD: Docker, Kubernetes และ Minikube Smoke Test

## วัตถุประสงค์

ต่อยอด CI เดิม (Backend test/build, Frontend build, Integration Test) โดยเพิ่มการตรวจสอบ Container และการ Deploy จริงลง Kubernetes แบบชั่วคราวเพื่อทดสอบความพร้อมของระบบ โดยไม่แตะ Production Environment

## Workflow

### 1. `.github/workflows/docker-image.yml`

รันอัตโนมัติเมื่อ push ไปยัง main/feat/test/fix/ci branches หรือเมื่อเปิด PR เข้า main/feat branches

- Backend - Test and Build: Maven unit tests, package, reports
- Frontend - Build: npm ci และ Vite build
- Backend - Integration: Maven verify เฉพาะ PR
- Kubernetes - Validate Manifests: Kubeconform ตรวจทุก YAML ใต้ `infra/minikube/e2e`
- Docker - Build Both Images: Build Backend/Frontend images หลัง Backend Tests และ Frontend Build ผ่าน

ไม่มีการ Push images ขึ้น registry และไม่มีการ Deploy ลง production ใน workflow นี้

### 2. `.github/workflows/minikube-e2e.yml`

รันอัตโนมัติบน PR **ที่มี base เป็น `feat/infra-docker-minikube`** เพื่อทดสอบงาน Integration ระหว่าง CI และ Infra ก่อนนำไปใช้บน main

เมื่อ workflow นี้เข้า default branch แล้ว สามารถเลือก GitHub Actions → **Minikube - Deploy and Smoke Test** → **Run workflow** เพื่อสั่งรันแบบ manual (`workflow_dispatch`)

ลำดับการทำงาน:

1. ติดตั้ง Kubectl และ Minikube (version ที่กำหนดแน่นอน)
2. Start Minikube ด้วย Docker driver บน GitHub-hosted runner
3. Docker build Backend และ Frontend โดยใช้ Dockerfiles ของ Infra/Backend
4. Load images เข้า Minikube ด้วย tag `:e2e`
5. สร้าง Namespace, password และ TLS certificate **เฉพาะชั่วคราวใน runner**
6. เรียก `infra/minikube/scripts/start.sh` เพื่อติดตั้ง manifests และรอ Deployments ready
7. Smoke test ทั้ง Backend readiness, Frontend HTML และ `GET /api/events` ผ่าน Nginx proxy
8. ลบ Minikube หลังทำงาน ไม่เปิด cluster ค้าง

**ข้อจำกัด:** Smoke Test เป็นเพียง HTTP/Deploy verification ยังไม่ใช่ Full Browser E2E Test และไม่ได้แปลว่า Production Deploy พร้อมแล้ว

## การตรวจรับ

สำหรับ PR นี้ต้องตรวจว่า:

- Existing tests ยังผ่าน
- Kubernetes schema validation ผ่าน
- Docker backend image build ผ่าน
- Docker frontend image build ผ่าน
- Minikube deploy และ Smoke Tests ผ่าน (ถ้า fail ให้ตรวจ log และแก้ที่ต้นเหตุ ไม่ skip test)
- ไม่มี real credentials, kubeconfig หรือ private keys ใน Git
- ไม่ต้องสร้าง GitHub Secrets สำหรับ smoke job นี้ เพราะระบบสร้าง test-only Secrets ชั่วคราว

## การประสานงาน

- **Backend:** รับผิดชอบ Maven tests, application startup, health endpoint และ business logic
- **Frontend:** รับผิดชอบ `npm run build` และการตอบสนองของ API client ผ่าน reverse proxy
- **Infrastructure:** รับผิดชอบ Dockerfiles, K8s manifests, readiness/liveness probes, Minikube scripts
- **QA:** รับผิดชอบ API / E2E test scenarios และตรวจผลทดสอบที่ได้จาก pipeline
- **CI/CD:** ดูแล GitHub Actions, build images, cluster startup, smoke checks และหลักฐาน Red/Green

การล้มเหลวจาก intentionally unimplemented business logic ใน test-first branches ยังคงถือเป็น expected test failure — **ไม่แก้ด้วยการ disable tests หรือ continue-on-error**

## PR flow

`ci/docker-k8s-validation` → PR เข้า `feat/infra-docker-minikube` เพื่อให้ CI ตรวจโค้ด Infra ล่าสุด เมื่อผ่านและ Infra review แล้วจึงค่อยรวม Infra feature เข้า `main` ผ่าน PR ตาม GitHub workflow ของทีม

หลัง Infra/CI เข้า `main` ให้ CI/CD ตรวจ required checks และพิจารณาขยายจาก ephemeral smoke deploy ไปสู่ CD target ที่ทีม Infra อนุมัติในภายหลัง
