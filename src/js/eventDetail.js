/* ===================================================
   📌 สำหรับ BACKEND: Mock Data สำหรับหน้า Event Detail
=================================================== */

// จำลองข้อมูลผู้ใช้สำหรับ Navbar
const mockUserData = {
  username: "User",
  role: "ผู้ใช้งานทั่วไป",
  avatarLetter: "A"
};

// จำลองข้อมูลรายละเอียดอีเวนต์ (ใช้ ID ดึงมาจากหน้าก่อน)
const mockEventDetail = {
  id: 1,
  statusBadge: "เปิดรับลงทะเบียน",
  heroBgColor: "#A3D4FF", // สีฟ้าอ่อนตามรูป (หรือเปลี่ยนเป็น URL รูปภาพ: `url('...')`)
  dateHeader: "พุธ 20 ส.ค. 2570 • 10:00",
  title: "Pet Expo",
  locationShort: "Central ladprao ชั้น 5",
  description: "งานสัตว์เลี้ยงที่ใหญ่ที่สุด",
  infoDate: "พุธ 20 ส.ค. 2570 • 10:00",
  infoLocation: "Central ladprao ชั้น 5",
  registeredCount: 1,
  totalSeats: 40,
  seatsAvailable: 99999, // ตัวเลขตามรูป Mockup
};

/* ===================================================
   📌 FRONTEND DOM RENDERER
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
      renderUserProfile(mockUserData);
    });

  // 2. เรนเดอร์ข้อมูลลงหน้าเพจ
  renderEventHero(mockEventDetail);
  renderEventDetails(mockEventDetail);
  renderTicketPanel(mockEventDetail);
});

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

  // ตรวจสอบว่า Backend ส่งมาเป็นสี (hex) หรือ URL รูปภาพ
  const bgStyle = event.heroBgColor.startsWith('#') 
    ? `background-color: ${event.heroBgColor};` 
    : `background-image: ${event.heroBgColor};`;

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

  // จัดรูปแบบตัวเลขให้มีลูกน้ำ (99,999)
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