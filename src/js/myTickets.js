/* ===================================================
   📌 1. MOCK DATA (ข้อมูลจำลองสำหรับ FRONTEND)
=================================================== */

// 🟢 ตัวแปรจำลองสถานะล็อกอิน ( true = ล็อกอินแล้ว, false = ยังไม่ล็อกอิน )
const isLoggedIn = true;

const mockUserData = {
  username: "User",
  role: "ผู้ดูแลระบบ",
  avatarLetter: "U"
};

// ข้อมูลจำลองตั๋วที่อิงจากดีไซน์ในรูปเป๊ะๆ
const mockTicketsData = [
  {
    ticketId: "GTH-7A8BC42012",
    eventName: "Pet Expo",
    badgeText: "ออกแบบ - วันที่ 1/1",
    dateTime: "พุธ 20 ส.ค. 2570 - 10:00",
    location: "Central ladprao ชั้น 5",
    ticketType: "Pet Expo - Free",
    issueDate: "เสาร์ 22 ส.ค. 2569",
    qrImageUrl: "image_217ee1.png" // ใช้รูปนี้จำลองเป็น QR ไปก่อน
  }
];

/* ===================================================
   📌 2. FRONTEND DOM RENDERER & BACKEND INTEGRATION
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar และสลับแถบสีส้มมาที่ "ตั๋วของฉัน"
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
  renderTicketsList(mockTicketsData);

  /* --- 2. โค้ดจริงที่ Backend ต้องเอามาใช้งาน (เอาคอมเมนต์ออก) ---
  const userId = "CURRENT_USER_ID"; // ดึงจาก Session
  fetch(`https://api.yourdomain.com/users/${userId}/tickets`)
    .then(response => response.json())
    .then(realTicketsData => {
      renderTicketsList(realTicketsData);
    })
    .catch(error => console.error("Error fetching tickets:", error));
  --------------------------------------------------------- */
});

/* ===================================================
   📌 3. ฟังก์ชันวาดหน้าจอ
=================================================== */

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

// ฟังก์ชันทำแถบสีส้มให้ตรงกับหน้า "ตั๋วของฉัน"
function setActiveNavTab() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.textContent.includes("ตั๋วของฉัน")) {
      link.classList.add("active");
    }
  });
}

function renderTicketsList(tickets) {
  const container = document.getElementById("tickets-list-container");
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 50px;">คุณยังไม่มีตั๋วในขณะนี้</div>`;
    return;
  }

  container.innerHTML = tickets.map(ticket => `
    <div class="ticket-wrapper">
      
      <!-- ซ้าย: สีฟ้า -->
      <div class="ticket-left">
        <span class="ticket-left-badge">${ticket.badgeText}</span>
        <div class="ticket-left-title">${ticket.eventName}</div>
      </div>

      <!-- กลาง: รายละเอียด -->
      <div class="ticket-middle">
        <div class="ticket-info-group">
          <label>วันและเวลา</label>
          <span>${ticket.dateTime}</span>
        </div>
        <div class="ticket-info-group">
          <label>สถานที่</label>
          <span>${ticket.location}</span>
        </div>
        <div class="ticket-info-group">
          <label>ประเภทบัตร</label>
          <span>${ticket.ticketType}</span>
        </div>
        <div class="ticket-info-group">
          <label style="font-weight: 500; font-size: 10px;">ออกบัตรเมื่อ ${ticket.issueDate}</label>
        </div>
      </div>

      <!-- ขวา: QR Code -->
      <div class="ticket-right">
        <!-- เราอ้างอิงถึง image_217ee1.png เป็นภาพจำลอง -->
        <img src="${ticket.qrImageUrl}" alt="QR Code" class="ticket-qr-img" onerror="this.src='https://via.placeholder.com/130x130?text=QR+Code'">
        <div class="ticket-id">${ticket.ticketId}</div>
        <div class="ticket-tap-hint">แตะเพื่อขยาย QR</div>
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