/* ===================================================
   📌 1. MOCK DATA (ข้อมูลจำลองสำหรับ FRONTEND)
   (BACKEND: ลบส่วนนี้ทิ้งได้เลยเมื่อเชื่อมต่อ API แล้ว)
=================================================== */

// ข้อมูลจำลองผู้ใช้งาน (มุมขวาบน)
const mockUserData = {
  username: "User",
  role: "ผู้ดูแลระบบ",
  avatarLetter: "A" // เปลี่ยนตัวอักษรย่อตามชื่อ User
};

// ข้อมูลจำลองรายละเอียดอีเวนต์ (อิงตามหน้าจอดีไซน์)
const mockEventsList = [
  {
    id: 1, // ID สมมติที่ส่งมาจากหน้า Upcoming (?id=1)
    statusBadge: "เปิดรับลงทะเบียน",
    heroBgColor: "#A6D6FC", // สีฟ้าแบบในรูป
    dateHeader: "พุธ 20 ส.ค. 2570 • 10:00",
    title: "Pet Expo",
    locationShort: "Central ladprao ชั้น 5",
    description: "งานสัตว์เลี้ยงที่ใหญ่ที่สุด",
    infoDate: "พุธ 20 ส.ค. 2570 • 10:00",
    infoLocation: "Central ladprao ชั้น 5",
    registeredCount: 1,
    totalSeats: 40,
    seatsAvailable: 99999
  }
];


/* ===================================================
   📌 2. ตัวควบคุมหน้าจอ (DOM RENDERER)
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar 
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
      renderUserProfile(mockUserData);
    });

  // 2. ดึง ID ของอีเวนต์จาก URL (เช่น EventDetailPage.html?id=1)
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  // =========================================================
  // 🔴 สำหรับ BACKEND: วิธีเชื่อมต่อ API ของจริง
  // =========================================================
  
  /* --- 1. โค้ดชั่วคราวของ Frontend (ให้คอมเมนต์หรือลบทิ้ง) --- */
  // ถ้าไม่มีการส่ง ID มา ให้ดึงงาน Pet Expo (id=1) มาโชว์เป็นตัวอย่างก่อน
  const eventData = mockEventsList.find(event => event.id == eventId) || mockEventsList[0];
  
  renderEventHero(eventData);
  renderEventDetails(eventData);
  renderTicketPanel(eventData);
  
  /* --- 2. โค้ดจริงที่ Backend ต้องเอามาใช้งาน (เอาคอมเมนต์ออก) ---
  // สมมติว่า Backend สร้าง API ไว้ที่ URL นี้
  const apiUrl = `https://api.yourdomain.com/events/${eventId}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(realEventData => {
      // โยนข้อมูลจริงจาก Database เข้าฟังก์ชันวาดหน้าจอ
      renderEventHero(realEventData);
      renderEventDetails(realEventData);
      renderTicketPanel(realEventData);
    })
    .catch(error => {
      console.error("ไม่สามารถดึงข้อมูลอีเวนต์ได้:", error);
      document.getElementById("event-hero-container").innerHTML = "<h2 style='text-align:center; padding: 50px;'>ไม่พบข้อมูลอีเวนต์</h2>";
    });
  --------------------------------------------------------- */
});


/* ===================================================
   📌 3. ฟังก์ชันวาดหน้าจอ (ห้ามลบ)
=================================================== */

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

function renderEventHero(event) {
  const container = document.getElementById("event-hero-container");
  if (!container) return;

  const bgStyle = event.heroBgColor.startsWith('#') 
    ? `background-color: ${event.heroBgColor};` 
    : `background-image: url('${event.heroBgColor}');`;

  container.innerHTML = `
    <div class="event-hero" style="${bgStyle}">
      <div class="event-hero-overlay">
        <div class="event-hero-badge">${event.statusBadge}</div>
        <div class="event-hero-date">${event.dateHeader}</div>
        <h1 class="event-hero-title">${event.title}</h1>
        <div class="event-hero-location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${event.locationShort}
        </div>
      </div>
    </div>
  `;
}

function renderEventDetails(event) {
  const container = document.getElementById("event-details-container");
  if (!container) return;

  container.innerHTML = `
    <div class="section-subtitle">เกี่ยวกับกิจกรรมนี้</div>
    <div class="event-desc-text">${event.description}</div>
    
    <div class="event-info-grid">
      <div class="info-box">
        <div class="info-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div>
          <div class="info-box-title">วันและเวลา</div>
          <div class="info-box-detail">${event.infoDate.replace(' • ', '<br>')}</div>
        </div>
      </div>
      
      <div class="info-box">
        <div class="info-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <div>
          <div class="info-box-title">สถานที่</div>
          <div class="info-box-detail">${event.infoLocation}</div>
        </div>
      </div>
      
      <div class="info-box">
        <div class="info-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div>
          <div class="info-box-title">จำนวนที่นั่ง</div>
          <div class="info-box-detail">ลงทะเบียนแล้ว ${event.registeredCount} / ${event.totalSeats}</div>
        </div>
      </div>
    </div>
  `;
}

function renderTicketPanel(event) {
  const container = document.getElementById("event-ticket-container");
  if (!container) return;

  const formattedSeats = event.seatsAvailable.toLocaleString('th-TH');

  container.innerHTML = `
    <div class="ticket-panel">
      <div class="ticket-panel-title">ที่นั่ง</div>
      <div class="ticket-seats-huge">เหลือ ${formattedSeats} ที่นั่ง</div>
      <div class="ticket-registered">ลงทะเบียนแล้ว ${event.registeredCount} / ${event.totalSeats}</div>
      
      <div class="ticket-type-toggle">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          ซ่อนประเภทบัตร
        </div>
        <span>›</span>
      </div>
    </div>
  `;
}