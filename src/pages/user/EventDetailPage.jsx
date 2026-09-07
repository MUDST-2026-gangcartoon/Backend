import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import '../../EventDetailPage.css'; 

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

export default function EventDetailPage() {
  const navigate = useNavigate();

  // 🟢 1. STATE MANAGEMENT
  const [eventData] = useState(mockEventDetail);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [showTickets, setShowTickets] = useState(true);
  
  // State สำหรับจัดการ Popup Modals: null | 'booking' | 'payment' | 'success'
  const [activeModal, setActiveModal] = useState(null); 
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(300);
  const [refCode, setRefCode] = useState('');

  // 🟢 2. SYSTEM TIMER
  useEffect(() => {
    let timer = null;
    if (activeModal === 'payment') {
      setPaymentTimeLeft(300);
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

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 🟢 3. HANDLERS
  const selectedTicket = eventData.tickets[selectedTicketIndex];
  const totalPrice = selectedTicket.price * qty;

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setQty(1);
    setSelectedTicketIndex(0);
    setActiveModal('booking');
  };

  const handleQtyChange = (change) => {
    setQty((prev) => {
      const newQty = prev + change;
      return newQty >= 1 && newQty <= 5 ? newQty : prev;
    });
  };

  const handleConfirmBooking = () => {
    if (totalPrice === 0) {
      generateRefCode();
      setActiveModal('success');
    } else {
      setActiveModal('payment');
    }
  };

  const handleSimulatePayment = () => {
    generateRefCode();
    setActiveModal('success');
  };

  const generateRefCode = () => {
    const random = "GTH-" + Math.random().toString(36).substring(2, 12).toUpperCase();
    setRefCode(random);
  };

  return (
    <>
      <Navbar />
      
      <div className="event-detail-page">
        {/* ปุ่มกลับ */}
        <div className="back-link-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            &larr; กลับไปดูอีเวนต์
          </button>
        </div>

        <div className="event-content-wrapper">
          {/* =========================================
              ฝั่งซ้าย: ข้อมูลรายละเอียดอีเวนต์
          ========================================= */}
          <div className="event-main-content">
            <div className="section-subtitle theme-text">{eventData.category}</div>
            <h1 className="event-title">{eventData.title}</h1>

            <div className="info-row">
              <div className="info-item">
                <div className="info-icon">🕒</div>
                <div>
                  <div className="info-label">วันและเวลา</div>
                  <div className="info-value">{eventData.dateTime}</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📍</div>
                <div>
                  <div className="info-label">สถานที่</div>
                  <div className="info-value">{eventData.location}</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">👥</div>
                <div>
                  <div className="info-label">จำนวนที่นั่ง</div>
                  <div className="info-value">ลงทะเบียนแล้ว {eventData.registeredSeats} / {eventData.totalSeats}</div>
                </div>
              </div>
            </div>

            <hr className="divider" />

            <div className="event-description">
              <div className="section-subtitle theme-text">รายละเอียดอีเวนต์</div>
              <h2>เกี่ยวกับกิจกรรมนี้</h2>
              {eventData.descriptionParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <hr className="divider" />

            <div className="event-organizer">
              <div className="org-header">
                <h3>👥 ผู้จัดอีเวนต์</h3>
                <button className="btn-text-theme" onClick={() => setShowOrganizer(!showOrganizer)}>
                  {showOrganizer ? 'ซ่อนข้อมูลผู้จัด >' : 'แสดงข้อมูลผู้จัด >'}
                </button>
              </div>
              {!showOrganizer && (
                <div className="org-profile">
                  <div className="org-avatar theme-bg">{eventData.organizer.avatarLetter}</div>
                  <div className="org-info">
                    <div className="org-label theme-text">{eventData.organizer.tag}</div>
                    <div className="org-name">{eventData.organizer.name}</div>
                    <div className="org-desc">{eventData.organizer.bio}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================
              ฝั่งขวา: การ์ดลงทะเบียน/ซื้อตั๋ว
          ========================================= */}
          <div className="event-sidebar">
            <div className="ticket-card">
              <div className="ticket-header">
                <div className="ticket-label">ที่นั่ง</div>
                <div className="ticket-left theme-text">เหลือ {eventData.seatsLeft.toLocaleString()} ที่นั่ง</div>
                <div className="ticket-reg">ลงทะเบียนแล้ว {eventData.registeredSeats} / {eventData.totalSeats}</div>
              </div>
              
              <hr className="divider" />
              
              <div className="ticket-types-toggle" onClick={() => setShowTickets(!showTickets)}>
                <span className="toggle-label">🎟️ {showTickets ? 'ซ่อนประเภทบัตร' : 'แสดงประเภทบัตร'}</span>
                <span className="toggle-icon">{showTickets ? '>' : 'v'}</span>
              </div>
              
              {showTickets && (
                <div className="ticket-list">
                  {eventData.tickets.map((t) => (
                    <div className="ticket-item" key={t.id}>
                      <div>
                        <div className="t-name">{t.name}</div>
                        <div className="t-desc">{t.desc}</div>
                      </div>
                      <div className="t-price theme-text">{t.priceText}</div>
                    </div>
                  ))}
                </div>
              )}
              
              <button className="btn-register theme-bg" onClick={handleRegisterClick}>
                ลงทะเบียน &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🟢 1. BOOKING MODAL (Popup จองบัตร) */}
      {/* ======================================================= */}
      {activeModal === 'booking' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box">
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-title">การจองบัตร: {eventData.title}</h2>
              <p className="modal-subtitle">{eventData.dateTime}</p>
            </div>

            <div className="modal-body">
              <label className="section-label">เลือกบัตรของคุณ</label>
              <div className="ticket-options">
                {eventData.tickets.map((t, index) => (
                  <div
                    key={t.id}
                    className={`modal-ticket-card ${selectedTicketIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedTicketIndex(index)}
                  >
                    <div>
                      <div className="t-name">{t.name}</div>
                      <div className="t-desc">{t.desc}</div>
                    </div>
                    <div className="t-price theme-text">{t.priceText}</div>
                  </div>
                ))}
              </div>

              <div className="qty-section">
                <span>จำนวนบัตร</span>
                <div className="qty-controls">
                  <button type="button" onClick={() => handleQtyChange(-1)}>−</button>
                  <input type="text" value={qty} readOnly />
                  <button type="button" onClick={() => handleQtyChange(1)}>+</button>
                </div>
              </div>

              <div className="total-section">
                <span>รวมทั้งหมด</span>
                <span className="theme-text" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {totalPrice === 0 ? 'ฟรี' : `฿${totalPrice.toLocaleString()}`}
                </span>
              </div>

              <button className="btn-register theme-bg" onClick={handleConfirmBooking} style={{ marginTop: '16px' }}>
                {totalPrice === 0 ? 'ยืนยันการรับบัตรฟรี &rarr;' : `ดำเนินการชำระเงิน ฿${totalPrice.toLocaleString()} &rarr;`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 🟢 2. PAYMENT MODAL & 3. SUCCESS MODAL */}
      {/* ======================================================= */}
      {/* โค้ดส่วนนี้ยังคง Logic เดิมของคุณไว้ แต่ปรับคลาสให้เข้ากับ Modal สีฟ้า */}
      {activeModal === 'payment' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>
            <h2 className="modal-title" style={{ marginTop: '16px' }}>ชำระเงิน</h2>
            <div className="total-section" style={{ justifyContent: 'center', margin: '24px 0' }}>
              <span className="theme-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>฿{totalPrice.toLocaleString()}</span>
            </div>
            
            <div style={{ margin: '0 auto 24px', width: '200px', height: '200px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              [Mockup QR Code]
            </div>

            <div style={{ color: paymentTimeLeft === 0 ? 'red' : 'var(--theme-blue)', fontWeight: 'bold', marginBottom: '16px' }}>
              {paymentTimeLeft > 0 ? `เวลาสแกนที่เหลือ: ${formatTimer(paymentTimeLeft)} นาที` : "หมดเวลาทำรายการ"}
            </div>

            <button className="btn-register theme-bg" onClick={handleSimulatePayment} disabled={paymentTimeLeft === 0}>
              จำลองว่าชำระเงินแล้ว ✓
            </button>
          </div>
        </div>
      )}

      {activeModal === 'success' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <h2 className="modal-title" style={{ marginTop: '16px', color: '#10B981' }}>🎉 จองสำเร็จแล้ว!</h2>
            <p className="modal-subtitle">รหัสอ้างอิง: <strong>{refCode}</strong></p>
            <p style={{ margin: '24px 0' }}>ตั๋วของคุณอยู่ในหน้า "ตั๋วของฉัน" พร้อม QR สำหรับเช็กอิน</p>
            <button className="btn-register theme-bg" onClick={() => setActiveModal(null)}>
              ปิดหน้านี้
            </button>
          </div>
        </div>
      )}
    </>
  );
}