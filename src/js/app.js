/* ===================================================
   📌 สำหรับ BACKEND: จุดเชื่อมต่อ API (Mock Data)
   เมื่อต่อ API สำเร็จ ให้ลบข้อมูลจำลองพวกนี้ทิ้ง 
   และนำ Response จาก API มาใส่ในฟังก์ชัน Render แทน
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Fetch & Render Navbar Component
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
    })
    .catch((error) => {
    console.error("โหลด Navbar ไม่สำเร็จ:", error);
    });
    

  // 2. Render Dynamic Data สำหรับ Hero และ Events Grid
  renderHeroData(mockHeroData);
  renderEventsGrid(mockEventsData);
});

/* ===================================================
   DATA MOCK (เผื่อไว้ให้ Backend นำไปเชื่อมต่อกับ API)
=================================================== */
const mockHeroData = {
  badgeText: "แนะนำ",
  title: "Pet Expo\nงานสัตว์เลี้ยงที่ใหญ่ที่สุด",
  dateTimeLocation: "พุธ, 20 ส.ค., 2570 · Central ladprao, ชั้น 5",
};

const mockEventsData = [
  {
    id: 1,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)", // สามารถเปลี่ยนเป็น URL รูปภาพได้
    bannerText: "DESIGN LAB\nMAKE IT CLEAR.",
    month: "ส.ค.",
    day: "19",
    title: "ออกแบบเพื่อผู้คนจริง",
    description: "เวิร์กช็อปลงมือทำเพื่อเปลี่ยนอินไซด์จากรีเสิร์ชให้เป็นอินเทอร์เฟซที่คนเข้าใจและไว้วางใจ",
    time: "10:00",
    location: "Creative Hall อาคาร A",
    seatsLeft: 40,
  },
  {
    id: 2,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
    bannerText: "SPRING BOOT AT SCALE",
    month: "ส.ค.",
    day: "25",
    title: "Spring Boot สำหรับระบบที่ขยายได้",
    description: "เรียนรู้การสร้างบริการที่เสถียรด้วยขอบเขตธุรกิจ การสังเกตระบบ และสถาปัตยกรรมที่ใช้งานได้จริง",
    time: "13:30",
    location: "Engineering Lab 3",
    seatsLeft: 60,
  },
  {
    id: 3,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #0f172a 0%, #f97316 100%)",
    bannerText: "PRODUCT NIGHT",
    month: "ส.ค.",
    day: "31",
    title: "คืนแห่งโปรดักต์ในมหาวิทยาลัย",
    description: "ทีมสตาร์ตอัพแชร์ต้นแบบ บทเรียน และเหตุผลเนื่องจากการตัดสินใจสร้างโปรดักต์",
    time: "17:30",
    location: "หอประชุมใหญ่",
    seatsLeft: 15,
  },
  {
    id: 4,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #0f172a 0%, #10b981 100%)",
    bannerText: "ACCESSIBILITY LAB",
    month: "ก.ย.",
    day: "7",
    title: "แล็บทดสอบเพื่อการเข้าถึง",
    description: "นำอินเทอร์เฟซของคุณมาทดสอบด้วยคีย์บอร์ด โปรแกรมอ่านหน้าจอ และเช็กลิสต์คอนทราสต์ที่ทำซ้ำได้",
    time: "09:00",
    location: "Digital Studio 2",
    seatsLeft: 25,
  }
];

function renderHeroData(hero) {
  const container = document.getElementById("hero-card-container");
  if (!container) return;

  container.innerHTML = `
    <div class="carousel-indicators">
      <div class="indicator active"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
      <div class="indicator"></div>
    </div>
    <div>
      <span class="hero-badge">${hero.badgeText}</span>
      <h2 class="hero-card-title">${hero.title.replace('\n', '<br>')}</h2>
      <p class="hero-card-info">📅 ${hero.dateTimeLocation}</p>
    </div>
    <button class="btn-circle-arrow">→</button>
  `;
}

function renderEventsGrid(events) {
  const gridContainer = document.getElementById("events-grid-container");
  if (!gridContainer) return;

  gridContainer.innerHTML = events.map(event => `
    <div class="event-card">
      <div class="card-banner" style="background: ${event.bannerBg}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; text-align: center;">
        <span class="status-badge">${event.statusBadge}</span>
        <div>${event.bannerText.replace('\n', '<br>')}</div>
      </div>
      <div class="card-body">
        <div class="date-box">
          <span class="date-month">${event.month}</span>
          <span class="date-day">${event.day}</span>
        </div>
        <div class="card-content">
          <div>
            <h3 class="event-title">${event.title}</h3>
            <p class="event-description">${event.description}</p>
            <div class="meta-info">
              <span class="meta-item">🕒 ${event.time}</span>
              <span class="meta-item">📍 ${event.location}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="seats-count">${event.seatsLeft} ที่นั่งเหลือ</span>
            <button class="btn-register">ลงทะเบียน →</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}


/*--ถ้าทำ back แล้ว ให้ใช้โค้ดนี้แทน mock data ด้านบน
ทำตัวแปร Mock Data ไว้ให้ข้างบนไฟล์ app.js หมดแล้วนะ 
ถ้าเขียน API เสร็จ เอามาเสียบแทนตัวแปร mockUserData, mockHeroData, mockEventsData ได้เลย
 ===================================================
   📌 สำหรับ BACKEND: จุดเชื่อมต่อ API (Mock Data)
   เมื่อต่อ API สำเร็จ ให้ลบข้อมูลจำลองพวกนี้ทิ้ง 
   และนำ Response จาก API มาใส่ในฟังก์ชัน Render แทน
=================================================== 

// 1. ข้อมูลผู้ใช้งาน (จำลองให้ Backend เห็น 3 แบบ: User, Admin, Staff)
const mockUserData = {
  username: "User",         // เปลี่ยนเป็นชื่อคนล็อกอิน
  role: "ผู้ใช้งานทั่วไป",       // เปลี่ยนเป็น "ผู้ดูแลระบบ (Admin)" หรือ "เจ้าหน้าที่ (Staff)" ได้
  avatarLetter: "U"         // ตัวอักษรย่อ หรือ URL รูปโปรไฟล์
};

// 2. ข้อมูลแบนเนอร์หลัก
const mockHeroData = {
  badgeText: "แนะนำ",
  title: "Pet Expo\nงานสัตว์เลี้ยงที่ใหญ่ที่สุด",
  dateTimeLocation: "พุธ, 20 ส.ค., 2570 · Central ladprao, ชั้น 5",
};

// 3. ข้อมูลรายการอีเวนต์ทั้งหมด
const mockEventsData = [
  {
    id: 1,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)", // รอรับเป็น URL รูปจาก Backend
    bannerText: "DESIGN LAB\nMAKE IT CLEAR.",
    month: "ส.ค.",
    day: "19",
    title: "ออกแบบเพื่อผู้คนจริง",
    description: "เวิร์กช็อปลงมือทำเพื่อเปลี่ยนอินไซด์จากรีเสิร์ชให้เป็นอินเทอร์เฟซที่คนเข้าใจและไว้วางใจ",
    time: "10:00",
    location: "Creative Hall อาคาร A",
    seatsLeft: 40,
  }
  // (ข้อมูลอีเวนต์อื่นๆ ใส่ต่อตรงนี้ได้เลย)
];


 ===================================================
   📌 ส่วนของฟังก์ชัน (FRONTEND DOM RENDERER)
=================================================== 
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
      // เมื่อโหลด Navbar เสร็จ ให้เรนเดอร์ข้อมูลผู้ใช้ทันที
      renderUserProfile(mockUserData);
    });

  // 2. โหลดเนื้อหาหลัก
  renderHeroData(mockHeroData);
  renderEventsGrid(mockEventsData);
});

// ฟังก์ชันอัปเดตโปรไฟล์มุมขวาบน
function renderUserProfile(user) {
  const avatar = document.getElementById("nav-avatar");
  const username = document.getElementById("nav-username");
  const role = document.getElementById("nav-role");

  if (avatar && username && role) {
    avatar.textContent = user.avatarLetter;
    username.textContent = user.username;
    role.textContent = user.role;
  }
}

function renderHeroData(hero) {
  const container = document.getElementById("hero-card-container");
  if (!container) return;
  container.innerHTML = `
    <div class="carousel-indicators">
      <div class="indicator active"></div><div class="indicator"></div><div class="indicator"></div><div class="indicator"></div>
    </div>
    <div>
      <span class="hero-badge">${hero.badgeText}</span>
      <h2 class="hero-card-title">${hero.title.replace('\n', '<br>')}</h2>
      <p class="hero-card-info">📅 ${hero.dateTimeLocation}</p>
    </div>
    <button class="btn-circle-arrow">→</button>
  `;
}

function renderEventsGrid(events) {
  const gridContainer = document.getElementById("events-grid-container");
  if (!gridContainer) return;

  gridContainer.innerHTML = events.map(event => `
    <div class="event-card">
      <!-- Backend สามารถส่งเป็น background-image: url(...) มาแทน gradient ได้ -->
      <div class="card-banner" style="background: ${event.bannerBg}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; text-align: center;">
        <span class="status-badge">${event.statusBadge}</span>
        <div>${event.bannerText.replace('\n', '<br>')}</div>
      </div>
      <div class="card-body">
        <div class="date-box">
          <span class="date-month">${event.month}</span>
          <span class="date-day">${event.day}</span>
        </div>
        <div class="card-content">
          <div>
            <h3 class="event-title">${event.title}</h3>
            <p class="event-description">${event.description}</p>
            <div class="meta-info">
              <span class="meta-item">🕒 ${event.time}</span>
              <span class="meta-item">📍 ${event.location}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="seats-count">${event.seatsLeft} ที่นั่งเหลือ</span>
            <button class="btn-register">ลงทะเบียน →</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}
*/