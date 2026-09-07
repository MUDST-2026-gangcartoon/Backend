import React, { useState, useEffect } from 'react';
import Navbar from "../../components/Navbar";
import '../../global.css'; // แก้ไขเป็น ../../ ถอย 2 ชั้น และชี้ไปที่ global.css

// 📌 ข้อมูลจำลองสำหรับตัวกิจกรรม (Mock Data)
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

function EventDetailPage() {
  // 🟢 1. STATE MANAGEMENT
  const [eventData] = useState(mockEventDetail);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0); // บัตรที่เลือก
  const [qty, setQty] = useState(1); // จำนวนบัตร
  const [showOrganizer, setShowOrganizer] = useState(true); // ซ่อน/แสดง ผู้จัด
  
  // State สำหรับจัดการ Popup Modals: null | 'booking' | 'payment' | 'success'
  const [activeModal, setActiveModal] = useState(null); 
  
  // State สำหรับระบบชำระเงิน
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(300); // 5 นาที (300 วินาที)
  const [refCode, setRefCode] = useState('');

  // 🟢 2. SYSTEM TIMER (นับถอยหลัง 5 นาทีเมื่อเปิด Payment Modal)
  useEffect(() => {
    let timer = null;
    if (activeModal === 'payment') {
      setPaymentTimeLeft(300); // รีเซ็ตเป็น 5 นาที
      timer = setInterval(() => {
        setPaymentTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeModal]);

  // ฟังก์ชันแปลงวินาที -> MM:SS
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 🟢 3. HANDLERS & LOGIC
  const selectedTicket = eventData.tickets[selectedTicketIndex];
  const totalPrice = selectedTicket.price * qty;

  // กดปุ่ม "ลงทะเบียน"
  const handleRegisterClick = (e) => {
    e.preventDefault();
    
    // ชั่วคราว: ตัดเงื่อนไขการล็อกอินออกไปก่อน เพื่อให้เทสปุ่มจองได้ง่ายๆ 
    // พอระบบล็อกอินเสร็จค่อยเอาส่วนนี้กลับมา
    
    setQty(1);
    setSelectedTicketIndex(0);
    setActiveModal('booking');
  };

  // ปรับจำนวนบัตร (1 - 5 ใบ)
  const handleQtyChange = (change) => {
    setQty((prevQty) => {
      const newQty = prevQty + change;
      return newQty >= 1 && newQty <= 5 ? newQty : prevQty;
    });
  };

  // ยืนยันการจองใน Popup
  const handleConfirmBooking = () => {
    if (totalPrice === 0) {
      // บัตรฟรี -> แสดง Popup Success ทันที
      generateRefCode();
      setActiveModal('success');
    } else {
      // บัตรเสียเงิน -> แสดง Popup ชำระเงิน
      setActiveModal('payment');
    }
  };

  // จำลองว่าชำระเงินสำเร็จ
  const handleSimulatePayment = () => {
    generateRefCode();
    setActiveModal('success');
  };

  // สุ่มรหัสอ้างอิง Reference Code
  const generateRefCode = () => {
    const random = "GTH-" + Math.random().toString(36).substring(2, 12).toUpperCase();
    setRefCode(random);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      {/* Navbar Component */}
      <Navbar />

      <main>
        {/* ปุ่มย้อนกลับ */}
        <div className="container back-nav">
          <a href="/UpcomingEventsPage" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            กลับไปดูอีเวนต์
          </a>
        </div>

        {/* HERO SECTION CONTAINER */}
        <section id="event-hero-container"></section>

        {/* MAIN LAYOUT */}
        <div className="container event-content-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
          
          {/* 👈 ด้านซ้าย: รายละเอียดกิจกรรม */}
          <div className="event-left-col">
            <div className="detail-category" style={{ fontSize: '12px', color: 'var(--accent-orange)', fontWeight: 600 }}>
              {eventData.category}
            </div>
            <h1 className="detail-event-title" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--dark-purple)', margin: '8px 0 24px' }}>
              {eventData.title}
            </h1>

            {/* Meta Info Bar */}
            <div className="meta-info-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div className="meta-info-box" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="meta-icon" style={{ fontSize: '20px' }}>🕒</div>
                <div>
                  <div className="meta-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>วันและเวลา</div>
                  <div className="meta-value" style={{ fontSize: '13px', fontWeight: 600 }}>{eventData.dateTime}</div>
                </div>
              </div>
              <div className="meta-info-box" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="meta-icon" style={{ fontSize: '20px' }}>📍</div>
                <div>
                  <div className="meta-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>สถานที่</div>
                  <div className="meta-value" style={{ fontSize: '13px', fontWeight: 600 }}>{eventData.location}</div>
                </div>
              </div>
              <div className="meta-info-box" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="meta-icon" style={{ fontSize: '20px' }}>👥</div>
                <div>
                  <div className="meta-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>จำนวนที่นั่ง</div>
                  <div className="meta-value" style={{ fontSize: '13px', fontWeight: 600 }}>
                    ลงทะเบียนแล้ว {eventData.registeredSeats} / {eventData.totalSeats}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Details */}
            <div className="detail-section" style={{ marginBottom: '40px' }}>
              <div className="section-subtitle" style={{ fontSize: '12px', color: 'var(--dark-purple)', fontWeight: 600 }}>รายละเอียดอีเวนต์</div>
              <h2 className="section-main-title" style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 16px' }}>เกี่ยวกับกิจกรรมนี้</h2>
              <div className="section-content" style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                {eventData.descriptionParagraphs.map((p, index) => (
                  <p key={index} style={{ marginBottom: '12px' }}>{p}</p>
                ))}
              </div>
            </div>

            {/* Organizer Section */}
            <div className="organizer-section" style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <div className="organizer-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="organizer-title-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="organizer-icon-text">👥</span>
                  <span className="organizer-head-label" style={{ fontWeight: 700 }}>ผู้จัดอีเวนต์</span>
                </div>
                <button 
                  onClick={() => setShowOrganizer(!showOrganizer)} 
                  style={{ background: 'none', border: 'none', color: '#0284C7', cursor: 'pointer', fontSize: '13px' }}
                >
                  {showOrganizer ? 'ซ่อนข้อมูลผู้จัด ❯' : 'แสดงข้อมูลผู้จัด ❯'}
                </button>
              </div>

              {showOrganizer && (
                <div className="organizer-card" style={{ display: 'flex', gap: '16px' }}>
                  <div className="organizer-avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#3B1C71', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {eventData.organizer.avatarLetter}
                  </div>
                  <div className="organizer-info">
                    <div className="organizer-tag" style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600 }}>{eventData.organizer.tag}</div>
                    <h3 className="organizer-name" style={{ fontSize: '16px', fontWeight: 700 }}>{eventData.organizer.name}</h3>
                    <p className="organizer-bio" style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{eventData.organizer.bio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 👉 ด้านขวา: Sticky Sidebar เลือกตั๋ว */}
          <div className="event-right-col">
            <div className="sticky-sidebar-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', position: 'sticky', top: '20px' }}>
              <div className="sidebar-blue-bar" style={{ height: '4px', background: '#70C5FF', borderRadius: '2px', marginBottom: '16px' }}></div>
              <div className="seats-counter-group" style={{ marginBottom: '20px' }}>
                <span className="seats-sublabel" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ที่นั่ง</span>
                <div className="seats-main-count" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--dark-purple)' }}>
                  เหลือ {eventData.seatsLeft.toLocaleString()} ที่นั่ง
                </div>
                <div className="seats-reg-count" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ลงทะเบียนแล้ว {eventData.registeredSeats} / {eventData.totalSeats}
                </div>
              </div>

              {/* รายการบัตร */}
              <div className="sidebar-ticket-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {eventData.tickets.map((t) => (
                  <div key={t.id} className="sidebar-ticket-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                    <div>
                      <div className="sidebar-ticket-name" style={{ fontWeight: 700, fontSize: '14px' }}>{t.name}</div>
                      <div className="sidebar-ticket-sub" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                    <div className={`sidebar-ticket-price ${t.price === 0 ? 'free' : ''}`} style={{ fontWeight: 700, color: t.price === 0 ? '#10B981' : 'var(--dark-purple)' }}>
                      {t.priceText}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn-register-action" 
                onClick={handleRegisterClick}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#FF6B4A', color: '#fff', border: 'none', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}
              >
                ลงทะเบียน →
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ======================================================= */}
      {/* 🟢 1. BOOKING MODAL (Popup จองบัตร) */}
      {/* ======================================================= */}
      {activeModal === 'booking' && (
        <div className="auth-modal-overlay" style={{ display: 'flex' }}>
          <div className="booking-modal-box">
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>
            <div className="booking-header">
              <div className="booking-icon"><img src="https://placehold.co/40x40/E0F2FE/0369A1?text=+" alt="Icon" /></div>
              <div className="booking-subtitle">การจองบัตร</div>
              <h2 className="booking-title">{eventData.title}</h2>
              <p className="booking-datetime-loc">{eventData.dateTime} • {eventData.location}</p>
            </div>

            <div className="booking-body">
              <label className="section-label">เลือกบัตรของคุณ</label>

              {/* การ์ดเลือกประเภทบัตร */}
              <div id="modal-ticket-options">
                {eventData.tickets.map((t, index) => (
                  <div
                    key={t.id}
                    className={`ticket-type-card ${selectedTicketIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedTicketIndex(index)}
                  >
                    <div className="ticket-type-info">
                      <div className="ticket-type-name">{t.name}</div>
                      <div className="ticket-type-desc">{t.desc} - เหลือ {eventData.seatsLeft.toLocaleString()} ใบ</div>
                    </div>
                    <div className="ticket-type-price">{t.priceText}</div>
                  </div>
                ))}
              </div>

              {/* ปรับจำนวน */}
              <div className="qty-section">
                <div className="qty-info">
                  <div className="qty-label">จำนวนบัตร</div>
                  <div className="qty-left">เหลือ {eventData.seatsLeft.toLocaleString()} ใบ</div>
                </div>
                <div className="qty-controls">
                  <button type="button" className="btn-qty" onClick={() => handleQtyChange(-1)}>−</button>
                  <input type="text" value={qty} readOnly />
                  <button type="button" className="btn-qty" onClick={() => handleQtyChange(1)}>+</button>
                </div>
              </div>

              {/* สรุปราคารวม */}
              <div className="total-section">
                <span className="total-label">รวมทั้งหมด</span>
                <span className="total-price">
                  {totalPrice === 0 ? 'ฟรี' : `฿${totalPrice.toLocaleString()}`}
                </span>
              </div>

              <button className="btn-submit-booking" onClick={handleConfirmBooking}>
                {totalPrice === 0 ? 'ยืนยันการรับบัตรฟรี →' : `ดำเนินการชำระเงิน ฿${totalPrice.toLocaleString()} →`}
              </button>
              <p className="booking-note">ยืนยันบัตรทันที หากยกเลิก ที่นั่งทั้งหมดในรายการนี้จะถูกคืน</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 🟢 2. PAYMENT MODAL (Popup ชำระเงิน) */}
      {/* ======================================================= */}
      {activeModal === 'payment' && (
        <div className="auth-modal-overlay" style={{ display: 'flex' }}>
          <div className="booking-modal-box">
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>

            <div className="booking-header">
              <div className="booking-icon" style={{ backgroundColor: '#E0F2FE', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2">
                  <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>
                </svg>
              </div>
              <div className="booking-subtitle">การจองบัตร</div>
              <h2 className="booking-title">{eventData.title}</h2>
              <p className="booking-datetime-loc">{eventData.dateTime} • {eventData.location}</p>
            </div>

            <div className="payment-body">
              <div className="payment-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 600 }}>
                <span>{selectedTicket.name} × {qty}</span>
                <span className="ref-code">฿{totalPrice.toLocaleString()}</span>
              </div>

              {/* QR Code Section */}
              <div className="qr-container" style={{ textAlign: 'center' }}>
                <div className="qr-box" style={{ margin: '0 auto 12px', width: '150px' }}>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mockup-payment" alt="QR Code" />
                </div>
                <p className="qr-title" style={{ fontWeight: 700 }}>สแกนเพื่อชำระเงิน (ตัวอย่าง)</p>
                <p className="qr-desc" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>QR นี้เป็น mockup เท่า นั้น ยังไม่มีการเชื่อมต่อผู้ให้บริการชำระเงิน</p>
                
                {/* ตัวนับเวลา */}
                <div className="timer-text" style={{ margin: '12px 0', color: paymentTimeLeft === 0 ? 'red' : '#0369A1', fontWeight: 700 }}>
                  {paymentTimeLeft > 0 
                    ? `เวลาสแกนที่เหลือ: ${formatTimer(paymentTimeLeft)} นาที` 
                    : "หมดเวลาทำรายการ กรุณาลองใหม่อีกครั้ง"}
                </div>
              </div>

              <button 
                className="btn-submit-booking" 
                onClick={handleSimulatePayment} 
                disabled={paymentTimeLeft === 0}
                style={{ backgroundColor: paymentTimeLeft === 0 ? '#CBD5E1' : '#7DD3FC', color: '#0369A1', marginBottom: '8px' }}
              >
                จำลองว่าชำระเงินแล้ว ✓
              </button>
              
              <button 
                className="btn-close-success" 
                onClick={() => setActiveModal('booking')} 
                style={{ backgroundColor: '#BAE6FD', color: '#0369A1', width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
              >
                ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 🟢 3. SUCCESS MODAL (Popup จองสำเร็จ) */}
      {/* ======================================================= */}
      {activeModal === 'success' && (
        <div className="auth-modal-overlay" style={{ display: 'flex' }}>
          <div className="booking-modal-box">
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>

            <div className="booking-header">
              <div className="booking-icon success-icon-bg" style={{ margin: '0 auto 12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2">
                  <rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect>
                  <path d="M7 12h.01"></path><path d="M17 12h.01"></path><path d="M12 12h.01"></path>
                </svg>
              </div>
              <div className="booking-subtitle" style={{ color: '#0F766E' }}>การจองบัตร</div>
              <h2 className="booking-title">{eventData.title}</h2>
              <p className="booking-datetime-loc">{eventData.dateTime} • {eventData.location}</p>
            </div>

            <div className="success-body" style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="success-shield-icon" style={{ marginBottom: '8px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </div>
              <h3 className="success-title-main" style={{ fontSize: '20px', color: '#0F766E', fontWeight: 700 }}>จองสำเร็จแล้ว</h3>
              <p className="success-subtitle-main" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ตั๋วของคุณอยู่ในหน้า "ตั๋วของฉัน" พร้อม QR สำหรับเช็กอิน</p>
            </div>

            <div className="success-ticket-details" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F0FDF4', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <span>{selectedTicket.name} × {qty}</span>
              <span className="ref-code" style={{ fontWeight: 700, color: '#0F766E' }}>{refCode}</span>
            </div>

            <button 
              className="btn-close-success" 
              onClick={() => setActiveModal(null)}
              style={{ width: '100%', padding: '12px', background: '#0F766E', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
            >
              ปิดหน้านี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetailPage;