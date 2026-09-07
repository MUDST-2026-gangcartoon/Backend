import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import '../../EventDetailPage.css'; 

// 📌 ฐานข้อมูลจำลอง (Mock Database) สำหรับอีเวนต์ทั้งหมด
const mockEventsDatabase = [
  {
    id: 1,
    category: "DESIGN LAB",
    title: "ออกแบบเพื่อผู้คนจริง",
    dateTime: "19 ส.ค. 2570 • 10:00",
    location: "Creative Hall อาคาร A",
    seatsLeft: 40,
    registeredSeats: 10,
    totalSeats: 50,
    descriptionParagraphs: [
      "เวิร์กชอปลงมือทำเพื่อเปลี่ยนอินไซต์จากการรีเสิร์ชให้เป็นอินเทอร์เฟซที่คนเข้าใจและไว้วางใจ",
      "มาร่วมเรียนรู้จากคนที่ลงมือทำจริง แลกเปลี่ยนมุมมองกับผู้เข้าร่วม และเก็บประสบการณ์ที่นำไปใช้ต่อได้หลังจบงาน"
    ],
    organizer: { name: "Design Community", avatarLetter: "D", tag: "ผู้จัดอีเวนต์", bio: "ชุมชนนักออกแบบที่ชอบแบ่งปันความรู้" },
    tickets: [
      { id: "t1", name: "Student", desc: "สำหรับนักศึกษา", price: 0, priceText: "ฟรี" },
      { id: "t2", name: "Public", desc: "บุคคลทั่วไป", price: 290, priceText: "฿290" }
    ]
  },
  {
    id: 2,
    category: "TECHNOLOGY",
    title: "Spring Boot สำหรับระบบที่ขยายได้",
    dateTime: "25 ส.ค. 2570 • 13:30",
    location: "Engineering Lab 3",
    seatsLeft: 60,
    registeredSeats: 40,
    totalSeats: 100,
    descriptionParagraphs: [
      "เรียนรู้การสร้างบริการที่เสถียรด้วยขอบเขตธุรกิจ การสังเกตระบบ และสถาปัตยกรรมที่ใช้งานได้จริง",
      "เหมาะสำหรับนักพัฒนาที่ต้องการยกระดับทักษะการเขียน Backend"
    ],
    organizer: { name: "Tech Meetup", avatarLetter: "T", tag: "ผู้จัดอีเวนต์", bio: "กลุ่มนักพัฒนาซอฟต์แวร์ที่หลงใหลในโค้ด" },
    tickets: [
      { id: "t1", name: "Early Bird", desc: "ราคาพิเศษ", price: 150, priceText: "฿150" },
      { id: "t2", name: "Regular", desc: "ราคาปกติ", price: 300, priceText: "฿300" }
    ]
  },
  {
    id: 3,
    category: "STARTUP",
    title: "คืนแห่งโปรดักต์ในมหาวิทยาลัย",
    dateTime: "31 ส.ค. 2570 • 17:30",
    location: "หอประชุมใหญ่",
    seatsLeft: 15,
    registeredSeats: 85,
    totalSeats: 100,
    descriptionParagraphs: [
      "ทีมสตาร์ตอัพแชร์ต้นแบบ บทเรียน และเหตุผลเนื่องจากการตัดสินใจสร้างโปรดักต์",
      "มาฟังประสบการณ์จริง เจ็บจริง โตจริง จากรุ่นพี่ในวงการ"
    ],
    organizer: { name: "Gather Campus Events", avatarLetter: "G", tag: "ผู้จัดอีเวนต์", bio: "ทีมจัดกิจกรรมจากนักศึกษาเพื่อนักศึกษา" },
    tickets: [
      { id: "t1", name: "All Access", desc: "เข้าร่วมได้ทุกคน", price: 0, priceText: "ฟรี" }
    ]
  },
  {
    id: 4,
    category: "ACCESSIBILITY",
    title: "แล็บทดสอบเพื่อการเข้าถึง",
    dateTime: "7 ก.ย. 2570 • 09:00",
    location: "Digital Studio 2",
    seatsLeft: 25,
    registeredSeats: 25,
    totalSeats: 50,
    descriptionParagraphs: [
      "นำอินเทอร์เฟซของคุณมาทดสอบด้วยคีย์บอร์ด โปรแกรมอ่านหน้าจอ และเช็กลิสต์คอนทราสต์ที่ทำซ้ำได้",
      "เพื่อสร้างเว็บไซต์ที่ทุกคนสามารถเข้าถึงได้อย่างเท่าเทียม"
    ],
    organizer: { name: "A11y Thailand", avatarLetter: "A", tag: "ผู้จัดอีเวนต์", bio: "ขับเคลื่อนความเท่าเทียมทางดิจิทัล" },
    tickets: [
      { id: "t1", name: "Workshop Pass", desc: "รวมอุปกรณ์ทดสอบ", price: 500, priceText: "฿500" }
    ]
  }
];

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams(); // 🟢 ดึง ID มาจาก URL เช่น /event-detail/1

  // 🟢 1. STATE MANAGEMENT
  const [eventData, setEventData] = useState(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [showTickets, setShowTickets] = useState(true);
  
  const [activeModal, setActiveModal] = useState(null); 
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(300);
  const [refCode, setRefCode] = useState('');

  // 🟢 2. ค้นหาข้อมูลอีเวนต์เมื่อ Component โหลด หรือ URL เปลี่ยน
  useEffect(() => {
    // แปลง eventId จาก URL เป็นตัวเลข แล้วไปหาใน mockDatabase
    const foundEvent = mockEventsDatabase.find(e => e.id === parseInt(eventId));
    
    if (foundEvent) {
      setEventData(foundEvent);
    } else {
      // ถ้าหาไม่เจอ (เช่น URL เป็น /event-detail เฉยๆ) ให้แสดงงานที่ 1 เป็นค่าเริ่มต้น
      setEventData(mockEventsDatabase[0]);
    }
    
    // รีเซ็ตค่าเมื่อเปลี่ยนหน้า
    setSelectedTicketIndex(0);
    setQty(1);
  }, [eventId]);

  // 🟢 3. SYSTEM TIMER
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

  // 🟢 4. HANDLERS
  // ป้องกัน Error ระหว่างที่ eventData ยังโหลดไม่เสร็จ
  if (!eventData) return <div style={{textAlign: 'center', marginTop: '100px'}}>กำลังโหลดข้อมูล...</div>;

  const selectedTicket = eventData.tickets[selectedTicketIndex];
  const totalPrice = selectedTicket.price * qty;

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setQty(1);
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
        <div className="back-link-container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            &larr; กลับไปดูอีเวนต์
          </button>
        </div>

        <div className="event-content-wrapper">
          {/* ================= ฝั่งซ้าย ================= */}
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

          {/* ================= ฝั่งขวา ================= */}
          <div className="event-sidebar">
              <div className="ticket-card">
                <span className="ticket-label">ที่นั่ง</span>
                <h2 className="ticket-left theme-text">เหลือ 40 ที่นั่ง</h2>
                <p className="ticket-reg">ลงทะเบียนแล้ว 10 / 50</p>
                
                <div className="ticket-divider" />

                <div className="ticket-types-toggle">
                  <span>🎟️ ซ่อนประเภทบัตร</span>
                  <span>›</span>
                </div>

                <div className="ticket-list">
                  <div className="ticket-item">
                    <div className="t-info">
                      <div className="t-name">Student</div>
                      <div className="t-desc">สำหรับนักศึกษา</div>
                    </div>
                    <div className="t-price theme-text">ฟรี</div>
                  </div>

                  <div className="ticket-item">
                    <div className="t-info">
                      <div className="t-name">Public</div>
                      <div className="t-desc">บุคคลทั่วไป</div>
                    </div>
                    <div className="t-price theme-text">฿290</div>
                  </div>
                </div>

                <button className="btn-register theme-bg" onClick={handleRegisterClick}>
                  ลงทะเบียน →
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
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
                {totalPrice === 0 ? 'ยืนยันการรับบัตรฟรี' : `ดำเนินการชำระเงิน ฿${totalPrice.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'payment' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>
            <h2 className="modal-title" style={{ marginTop: '16px' }}>ชำระเงิน</h2>
            <div className="total-section" style={{ justifyContent: 'center', margin: '24px 0' }}>
              <span className="theme-text" style={{ fontSize: '32px', fontWeight: 'bold' }}>฿{totalPrice.toLocaleString()}</span>
            </div>
            
            <div style={{ 
              margin: '0 auto 24px', 
              width: '200px', 
              height: '200px', 
              background: 'white', 
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://promptpay.io/0812345678/290" 
                alt="QR Code สำหรับชำระเงิน" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
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