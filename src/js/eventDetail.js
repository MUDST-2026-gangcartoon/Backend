/* ===================================================
   📌 1. MOCK DATA (ข้อมูลจำลองสำหรับ FRONTEND)
=================================================== */
const mockEventDetail = {
  id: 1,
  category: "เกี่ยวกับกิจกรรมนี้",
  title: "งานสัตว์เลี้ยงที่ใหญ่ที่สุด",
  dateTime: "พุธ 20 ส.ค. 2570 • 10:00",
  location: "Central ladprao ชั้น 5",
  seatsLeft: 99999,
  registeredSeats: 1,
  totalSeats: 40,
  descriptionParagraphs: [
    "เวิร์กชอปลงมือทำเพื่อเปลี่ยนอินไซต์จากการรีเสิร์ชให้เป็นอินเทอร์เฟซที่คนเข้าใจและไว้วางใจ",
    "มาร่วมเรียนรู้จากคนที่ลงมือทำจริง แลกเปลี่ยนมุมมองกับผู้เข้าร่วม และเก็บประสบการณ์ที่นำไปใช้ต่อได้หลังจบงาน"
  ],
  organizer: {
    name: "Gather Campus Events",
    avatarLetter: "G",
    tag: "ผู้จัดอีเวนต์",
    bio: "ทีมจัดกิจกรรมจากนักศึกษาที่สร้างพื้นที่ให้เรียนรู้ แลกเปลี่ยน และพบผู้คนใหม่ในมหาวิทยาลัย"
  },
  tickets: [
    { id: "t1", name: "Student", desc: "For current students", price: 0, priceText: "ฟรี" },
    { id: "t2", name: "Public", desc: "Includes workshop materials", price: 290, priceText: "฿290" }
  ]
};

/* ===================================================
   📌 2. FRONTEND DOM RENDERER & BACKEND INTEGRATION
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลด Navbar
  fetch("../../components/navbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("navbar-placeholder").innerHTML = data;
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const user = { username: "User", role: "ผู้ใช้งานทั่วไป", avatarLetter: "U" };
      
      if (typeof updateNavbarState === "function") {
        updateNavbarState(isLoggedIn, user);
      }
    });

  // =========================================================
  // 🔴 สำหรับ BACKEND: วิธีเชื่อมต่อ API ของจริง
  // =========================================================
  /*
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  fetch(`https://api.yourdomain.com/events/${eventId}`)
    .then(response => response.json())
    .then(realEventData => {
      renderEventPage(realEventData);
    })
    .catch(error => console.error("Error fetching event details:", error));
  */

  // Render ข้อมูลหน้าเว็บด้วย Mock Data ชั่วคราว
  renderEventPage(mockEventDetail);
});

/* ===================================================
   📌 3. ฟังก์ชัน Render หน้าจอ
=================================================== */
function renderEventPage(eventData) {
  // Render ฝั่งซ้าย (#event-details-container)
  const leftCol = document.getElementById("event-details-container");
  if (leftCol) {
    leftCol.innerHTML = `
      <div class="detail-category">${eventData.category}</div>
      <h1 class="detail-event-title">${eventData.title}</h1>

      <div class="meta-info-bar">
        <div class="meta-info-box">
          <div class="meta-icon">🕒</div>
          <div>
            <div class="meta-label">วันและเวลา</div>
            <div class="meta-value">${eventData.dateTime}</div>
          </div>
        </div>
        <div class="meta-info-box">
          <div class="meta-icon">📍</div>
          <div>
            <div class="meta-label">สถานที่</div>
            <div class="meta-value">${eventData.location}</div>
          </div>
        </div>
        <div class="meta-info-box">
          <div class="meta-icon">👥</div>
          <div>
            <div class="meta-label">จำนวนที่นั่ง</div>
            <div class="meta-value">ลงทะเบียนแล้ว ${eventData.registeredSeats} / ${eventData.totalSeats}</div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-subtitle">รายละเอียดอีเวนต์</div>
        <h2 class="section-main-title">เกี่ยวกับกิจกรรมนี้</h2>
        <div class="section-content">
          ${eventData.descriptionParagraphs.map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>

      <div class="organizer-section">
        <div class="organizer-header">
          <div class="organizer-title-group">
            <span class="organizer-icon-text">👥</span>
            <span class="organizer-head-label">ผู้จัดอีเวนต์</span>
          </div>
          <a href="#" class="btn-toggle-organizer">ซ่อนข้อมูลผู้จัด ❯</a>
        </div>
        <div class="organizer-card">
          <div class="organizer-avatar">${eventData.organizer.avatarLetter}</div>
          <div class="organizer-info">
            <div class="organizer-tag">${eventData.organizer.tag}</div>
            <h3 class="organizer-name">${eventData.organizer.name}</h3>
            <p class="organizer-bio">${eventData.organizer.bio}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Render ฝั่งขวา Sticky Sidebar (#event-ticket-container)
  const rightCol = document.getElementById("event-ticket-container");
  if (rightCol) {
    rightCol.innerHTML = `
      <div class="sticky-sidebar-card">
        <div class="sidebar-blue-bar"></div>
        <div class="seats-counter-group">
          <span class="seats-sublabel">ที่นั่ง</span>
          <div class="seats-main-count">เหลือ ${eventData.seatsLeft.toLocaleString()} ที่นั่ง</div>
          <div class="seats-reg-count">ลงทะเบียนแล้ว ${eventData.registeredSeats} / ${eventData.totalSeats}</div>
        </div>

        <div class="ticket-header-accordion">
          <span>🎫 ซ่อนประเภทบัตร</span>
          <span>❯</span>
        </div>

        <div class="sidebar-ticket-list">
          ${eventData.tickets.map(t => `
            <div class="sidebar-ticket-item">
              <div>
                <div class="sidebar-ticket-name">${t.name}</div>
                <div class="sidebar-ticket-sub">${t.desc}</div>
              </div>
              <div class="sidebar-ticket-price ${t.price === 0 ? 'free' : ''}">${t.priceText}</div>
            </div>
          `).join('')}
        </div>

        <button class="btn-register-action" onclick="handleRegisterClick(event)">ลงทะเบียน →</button>
      </div>
    `;
  }

  // เตรียมข้อมูลใส่ Popup Modal
  document.getElementById("modal-event-title").textContent = eventData.title;
  document.getElementById("modal-event-meta").textContent = `${eventData.dateTime} • ${eventData.location}`;
  document.getElementById("modal-seats-left").textContent = `เหลือ ${eventData.seatsLeft.toLocaleString()} ใบ`;
  
  // สร้างการ์ดเลือกบัตรใน Popup
  const ticketOptionsContainer = document.getElementById("modal-ticket-options");
  if (ticketOptionsContainer) {
    ticketOptionsContainer.innerHTML = eventData.tickets.map((t, index) => `
      <div class="ticket-type-card ${index === 0 ? 'active' : ''}" onclick="selectTicketType(${index})" id="ticket-card-${index}">
        <div class="ticket-type-info">
          <div class="ticket-type-name">${t.name}</div>
          <div class="ticket-type-desc">${t.desc} - เหลือ ${eventData.seatsLeft.toLocaleString()} ใบ</div>
        </div>
        <div class="ticket-type-price">${t.priceText}</div>
      </div>
    `).join('');
  }
  
  // อัปเดตราคาเริ่มต้น
  updateTotalPrice();
}

/* ===================================================
   📌 4. BOOKING CONTROLS & LOGIC
=================================================== */
let currentQty = 1;
let selectedTicketIndex = 0; // ค่าเริ่มต้นเลือกบัตรใบแรก (Student)

function handleRegisterClick(event) {
  event.preventDefault();
  
  // ปิดโค้ดเดิมไว้ก่อน
  // const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  
  // 🟢 บังคับให้เป็น true เพื่อเทสหน้าจองบัตร
  const isLoggedIn = true; 

  if (!isLoggedIn) {
    if (typeof openModal === "function") {
      openModal(event, 'login');
    } else {
      alert("กรุณาเข้าสู่ระบบก่อนทำการลงทะเบียน");
    }
  } else {
    // ถ้าล็อกอินแล้ว เปิด Popup จองบัตร
    openBookingModal();
  }
}

function openBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    currentQty = 1;
    document.getElementById('ticket-qty').value = currentQty;
  }
}

function closeBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function updateQty(change) {
  let newQty = currentQty + change;
  if (newQty >= 1 && newQty <= 5) {
    currentQty = newQty;
    document.getElementById('ticket-qty').value = currentQty;
  }
}

let paymentTimerInterval = null;
let paymentTimeLeft = 300; // 5 นาที (300 วินาที)

// 🟢 อัปเดตฟังก์ชัน confirmBooking ให้แยกเคส บัตรฟรี vs บัตรเสียเงิน
function confirmBooking() {
  const selectedTicket = mockEventDetail.tickets[selectedTicketIndex];
  const totalPrice = selectedTicket.price * currentQty;

  closeBookingModal();

  if (totalPrice === 0) {
    // ถ้าฟรี -> ไปหน้า Success ทันที
    showSuccessModal();
  } else {
    // ถ้าเสียเงิน -> เปิด Popup ชำระเงิน QR Code
    openPaymentModal(selectedTicket, totalPrice);
  }
}

// 🟢 เปิด Popup ชำระเงิน & เริ่มนับเวลา 5 นาที
function openPaymentModal(ticket, totalPrice) {
  const eventTitle = document.getElementById("modal-event-title") ? document.getElementById("modal-event-title").textContent : "งานสัตว์เลี้ยงที่ใหญ่ที่สุด";
  const eventMeta = document.getElementById("modal-event-meta") ? document.getElementById("modal-event-meta").textContent : "พุธ 20 ส.ค. 2570 • Central ladprao ชั้น 5";

  document.getElementById("payment-event-title").textContent = eventTitle;
  document.getElementById("payment-event-meta").textContent = eventMeta;
  document.getElementById("payment-ticket-summary").textContent = `${ticket.name} × ${currentQty}`;
  document.getElementById("payment-total-price-text").textContent = `฿${totalPrice.toLocaleString()}`;

  // รีเซ็ตปุ่มชำระเงิน
  const payBtn = document.getElementById("btn-simulate-pay");
  payBtn.disabled = false;
  payBtn.style.backgroundColor = "#7DD3FC";

  // แสดง Modal
  const paymentModal = document.getElementById('payment-modal-overlay');
  if (paymentModal) paymentModal.style.display = 'flex';

  // เริ่มนับเวลาถอยหลัง 5 นาที
  startPaymentTimer();
}

// 🟢 ตัวนับเวลาถอยหลัง 5 นาที
function startPaymentTimer() {
  clearInterval(paymentTimerInterval);
  paymentTimeLeft = 300; // 300 วินาที
  updateTimerDisplay();

  paymentTimerInterval = setInterval(() => {
    paymentTimeLeft--;
    updateTimerDisplay();

    if (paymentTimeLeft <= 0) {
      clearInterval(paymentTimerInterval);
      document.getElementById("payment-timer").textContent = "หมดเวลาทำรายการ กรุณาลองใหม่อีกครั้ง";
      const payBtn = document.getElementById("btn-simulate-pay");
      payBtn.disabled = true;
      payBtn.style.backgroundColor = "#CBD5E1";
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(paymentTimeLeft / 60).toString().padStart(2, '0');
  const s = (paymentTimeLeft % 60).toString().padStart(2, '0');
  const timerEl = document.getElementById("payment-timer");
  if (timerEl) {
    timerEl.textContent = `เวลาสแกนที่เหลือ: ${m}:${s} นาที`;
  }
}

// 🟢 กดปุ่ม "จำลองว่าชำระเงินแล้ว ✓"
function simulatePaymentSuccess() {
  clearInterval(paymentTimerInterval);
  closePaymentModal();
  showSuccessModal();
}

// 🟢 ปิด Popup ชำระเงิน
function closePaymentModal() {
  clearInterval(paymentTimerInterval);
  const paymentModal = document.getElementById('payment-modal-overlay');
  if (paymentModal) paymentModal.style.display = 'none';
}

// 🟢 ปุ่มย้อนกลับไปหน้าเลือกบัตร
function backToBookingModal() {
  closePaymentModal();
  openBookingModal();
}

// 🟢 แสดง Popup จองสำเร็จ
function showSuccessModal() {
  const eventTitle = document.getElementById("modal-event-title") ? document.getElementById("modal-event-title").textContent : "งานสัตว์เลี้ยงที่ใหญ่ที่สุด";
  const eventMeta = document.getElementById("modal-event-meta") ? document.getElementById("modal-event-meta").textContent : "พุธ 20 ส.ค. 2570 • Central ladprao ชั้น 5";
  const selectedTicket = mockEventDetail.tickets[selectedTicketIndex];

  document.getElementById("success-event-title").textContent = eventTitle;
  document.getElementById("success-event-meta").textContent = eventMeta;
  document.getElementById("success-ticket-type-qty").textContent = `${selectedTicket.name} × ${currentQty}`;

  const randomRef = "GTH-" + Math.random().toString(36).substring(2, 12).toUpperCase();
  document.getElementById("success-ticket-ref").textContent = randomRef;

  const successModal = document.getElementById('success-modal-overlay');
  if (successModal) successModal.style.display = 'flex';
}

// 🟢 ฟังก์ชันปิด Popup จองสำเร็จ
function closeSuccessModal() {
  const successModal = document.getElementById('success-modal-overlay');
  if (successModal) {
    successModal.style.display = 'none';
  }
}

function closeSuccessModal() {
  // ปิด Popup
  document.getElementById('success-modal-overlay').style.display = 'none';
  
  // ถ้าต้องการให้ปิดแล้วพาไปหน้า "ตั๋วของฉัน" เลย ให้เอาเครื่องหมาย // บรรทัดล่างออกครับ
  // window.location.href = "MyRegistrationsPage.html";
}
  
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
;


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

// ฟังก์ชันเมื่อกดเลือกประเภทบัตร
function selectTicketType(index) {
  selectedTicketIndex = index;
  
  // ล้างคลาส active ออกจากบัตรทุกใบ
  const allCards = document.querySelectorAll('#modal-ticket-options .ticket-type-card');
  allCards.forEach(card => card.classList.remove('active'));
  
  // ใส่คลาส active ให้ใบที่ถูกคลิก
  document.getElementById(`ticket-card-${index}`).classList.add('active');
  
  // อัปเดตราคา
  updateTotalPrice();
}

// ฟังก์ชันคำนวณราคารวมและเปลี่ยนข้อความปุ่ม
function updateTotalPrice() {
  const selectedTicket = mockEventDetail.tickets[selectedTicketIndex];
  const totalPrice = selectedTicket.price * currentQty;
  const priceDisplay = document.getElementById("modal-total-price");
  const submitBtn = document.getElementById("btn-confirm-submit");

  if (totalPrice === 0) {
    priceDisplay.textContent = "ฟรี";
    submitBtn.textContent = "ยืนยันการรับบัตรฟรี →";
  } else {
    priceDisplay.textContent = `฿${totalPrice.toLocaleString()}`;
    submitBtn.textContent = `ดำเนินการชำระเงิน ฿${totalPrice.toLocaleString()} →`;
  }
}

// ต้องอัปเดตฟังก์ชันนี้ด้วย เพื่อให้เปลี่ยนจำนวนแล้วราคาเปลี่ยนตาม
function updateQty(change) {
  let newQty = currentQty + change;
  if (newQty >= 1 && newQty <= 5) { // จำกัดสูงสุด 5 ใบ
    currentQty = newQty;
    document.getElementById('ticket-qty').value = currentQty;
    updateTotalPrice(); // เรียกใช้อัปเดตราคาทุกครั้งที่เพิ่ม/ลดจำนวน
  }
}