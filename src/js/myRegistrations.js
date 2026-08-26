/* ===================================================
   📌 1. MOCK DATA (ข้อมูลจำลองสำหรับ FRONTEND)
   (BACKEND: ลบส่วนนี้ทิ้งได้เลยเมื่อเชื่อมต่อ API แล้ว)
=================================================== */

// 🟢 ตัวแปรจำลองสถานะล็อกอิน ( true = ล็อกอินแล้ว, false = ยังไม่ล็อกอิน )
const isLoggedIn = true;

// ข้อมูลจำลองผู้ใช้
const mockUserData = {
  username: "User",
  role: "ผู้ใช้งานทั่วไป",
  avatarLetter: "A"
};

// ข้อมูลจำลองรายการที่ผู้ใช้คนนี้เคยลงทะเบียนไว้
const mockUserRegistrations = [
  {
    ticketId: "T-PET-001",
    eventId: 1,
    title: "Pet Expo - งานสัตว์เลี้ยงที่ใหญ่ที่สุด",
    month: "ส.ค.",
    day: "20",
    time: "10:00 - 18:00 น.",
    location: "Central ladprao ชั้น 5",
    status: "success",
    statusText: "ลงทะเบียนสำเร็จ"
  },
  {
    ticketId: "T-SPRING-002",
    eventId: 2,
    title: "Spring Boot สำหรับระบบที่ขยายได้",
    month: "ส.ค.",
    day: "25",
    time: "13:30 - 16:30 น.",
    location: "Engineering Lab 3",
    status: "success",
    statusText: "ลงทะเบียนสำเร็จ"
  }
];


/* ===================================================
   📌 2. FRONTEND DOM RENDERER & BACKEND INTEGRATION
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar และสลับแท็บ active มาที่ "การลงทะเบียนของฉัน"
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
      
      // 🟢 เรียกใช้ updateNavbarState แทน renderUserProfile
      updateNavbarState(isLoggedIn, mockUserData);
      setActiveNavTab();
    });

  // =========================================================
  // 🔴 สำหรับ BACKEND: วิธีเชื่อมต่อ API ของจริง
  // =========================================================
  
  /* --- 1. โค้ดชั่วคราวของ Frontend (ใช้ Mock Data) --- */
  renderRegistrationsList(mockUserRegistrations);

  /* --- 2. โค้ดจริงที่ Backend ต้องเอามาใช้งาน (เอาคอมเมนต์ออก) ---
  const userId = "CURRENT_USER_ID"; // ดึงจาก Session/JWT
  fetch(`https://api.yourdomain.com/users/${userId}/registrations`)
    .then(response => response.json())
    .then(realRegistrationsData => {
      renderRegistrationsList(realRegistrationsData);
    })
    .catch(error => {
      console.error("ไม่สามารถดึงข้อมูลรายการลงทะเบียนได้:", error);
    });
  --------------------------------------------------------- */
});

// ไฮไลต์แท็บ Navbar ให้ตรงกับหน้าที่อยู่ปัจจุบัน
function setActiveNavTab() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.textContent.includes("การลงทะเบียนของฉัน")) {
      link.classList.add("active");
    }
  });
}

// 🟢 ฟังก์ชันจัดการการแสดงผล Navbar ตามสถานะการล็อกอิน
function updateNavbarState(isLoggedIn, user) {
  const guestView = document.getElementById("nav-guest-view");
  const userView = document.getElementById("nav-user-view");

  if (!guestView || !userView) return;

  if (isLoggedIn && user) {
    guestView.style.display = "none";
    userView.style.display = "flex";

    const avatar = document.getElementById("nav-avatar");
    const username = document.getElementById("nav-username");
    const role = document.getElementById("nav-role");

    if (avatar) avatar.textContent = user.avatarLetter;
    if (username) username.textContent = user.username;
    if (role) role.textContent = user.role;
  } else {
    guestView.style.display = "flex";
    userView.style.display = "none";
  }
}

function renderRegistrationsList(list) {
  const container = document.getElementById("registrations-list-container");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 60px; color: var(--text-muted);">
        ยังไม่มีรายการลงทะเบียนอีเวนต์ในขณะนี้
      </div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="registration-card">
      <div class="reg-left-info">
        <div class="reg-date-badge">
          <span class="reg-month">${item.month}</span>
          <span class="reg-day">${item.day}</span>
        </div>
        <div class="reg-details">
          <div class="reg-title">${item.title}</div>
          <div class="reg-meta">
            <span>🕒 ${item.time}</span>
            <span>📍 ${item.location}</span>
          </div>
        </div>
      </div>

      <div class="reg-right-actions">
        <span class="status-pill ${item.status}">${item.statusText}</span>
        <!-- ปุ่มเชื่อมไปหน้าตั๋ว MyTicketsPage.html พร้อมส่ง ID ตั๋วไป -->
        <a href="MyTicketsPage.html?ticketId=${item.ticketId}" class="btn-view-ticket">ดูตั๋วของฉัน →</a>
      </div>
    </div>
  `).join('');
}

// 🟢 ฟังก์ชันจัดการการแสดงผล Navbar ตามสถานะการล็อกอิน (อัปเดตใหม่ ซ่อนเมนู)
function updateNavbarState(isLoggedIn, user) {
  const guestView = document.getElementById("nav-guest-view");
  const userView = document.getElementById("nav-user-view");

  // ดึง ID ของเมนูที่ต้องการซ่อน/แสดง
  const navRegistrations = document.getElementById("nav-registrations");
  const navTickets = document.getElementById("nav-tickets");

  if (!guestView || !userView) return;

  if (isLoggedIn && user) {
    // ---- กรณีล็อกอินแล้ว ----
    guestView.style.display = "none";
    userView.style.display = "flex";

    // แสดงเมนูทั้ง 2 อัน
    if (navRegistrations) navRegistrations.style.display = "inline-flex";
    if (navTickets) navTickets.style.display = "inline-flex";

    // อัปเดตข้อมูลผู้ใช้
    const avatar = document.getElementById("nav-avatar");
    const username = document.getElementById("nav-username");
    const role = document.getElementById("nav-role");
    if (avatar) avatar.textContent = user.avatarLetter;
    if (username) username.textContent = user.username;
    if (role) role.textContent = user.role;

  } else {
    // ---- กรณียังไม่ล็อกอิน (Guest) ----
    guestView.style.display = "flex";
    userView.style.display = "none";

    // ซ่อนเมนูทั้ง 2 อัน
    if (navRegistrations) navRegistrations.style.display = "none";
    if (navTickets) navTickets.style.display = "none";
  }
}