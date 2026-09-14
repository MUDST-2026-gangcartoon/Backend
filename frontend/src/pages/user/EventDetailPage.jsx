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
  const { eventId } = useParams();

  // 🟢 1. STATE MANAGEMENT
  const [eventData, setEventData] = useState(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [qty, setQty] = useState(1);
  
  const [showOrganizer, setShowOrganizer] = useState(true);
  const [showTickets, setShowTickets] = useState(true);
  
  const [activeModal, setActiveModal] = useState(null); 
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(300);
  const [refCode, setRefCode] = useState('');

  // 🟢 2. ค้นหาข้อมูลอีเวนต์
  useEffect(() => {
    const foundEvent = mockEventsDatabase.find(e => e.id === parseInt(eventId));
    if (foundEvent) {
      setEventData(foundEvent);
    } else {
      setEventData(mockEventsDatabase[0]);
    }
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
              {showOrganizer && (
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
              <div className="event-booking-card">
                <span className="ticket-label">ที่นั่ง</span>
                <h2 className="ticket-left theme-text">เหลือ {eventData.seatsLeft} ที่นั่ง</h2>
                <p className="ticket-reg">ลงทะเบียนแล้ว {eventData.registeredSeats} / {eventData.totalSeats}</p>
                
                <div className="ticket-divider" />

                <div 
                  className="ticket-types-toggle" 
                  onClick={() => setShowTickets(!showTickets)}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}
                >
                  <span>🎟️ {showTickets ? 'ซ่อนประเภทบัตร' : 'แสดงประเภทบัตร'}</span>
                  <span>{showTickets ? '˅' : '›'}</span>
                </div>

                {showTickets && (
                  <div className="ticket-list">
                    {eventData.tickets.map(t => (
                      <div className="ticket-item" key={t.id}>
                        <div className="t-info">
                          <div className="t-name">{t.name}</div>
                          <div className="t-desc">{t.desc}</div>
                        </div>
                        <div className="t-price theme-text">{t.priceText}</div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-register theme-bg" onClick={handleRegisterClick}>
                  ลงทะเบียน →
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {/* 1. Modal เลือกบัตร */}
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
                  ฿{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-modal-confirm theme-bg" 
                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: 'none', color: '#fff', cursor: 'pointer' }}
                onClick={handleConfirmBooking}
              >
                ยืนยันการจอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal ชำระเงิน */}
      {activeModal === 'payment' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <button className="btn-close-modal" onClick={() => setActiveModal(null)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-title">ชำระเงิน</h2>
              <p>สแกน QR Code ด้านล่างเพื่อชำระเงิน</p>
            </div>
            
            <div style={{ margin: '20px auto', width: '200px', height: '200px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '2px dashed #ccc' }}>
              <span style={{ color: '#888' }}>QR Code ยอด ฿{totalPrice.toLocaleString()}</span>
            </div>

            <p className="theme-text" style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
              {formatTimer(paymentTimeLeft)}
            </p>
            {paymentTimeLeft === 0 && <p style={{ color: 'red' }}>หมดเวลาทำรายการ กรุณาทำรายการใหม่</p>}

            <button 
              className="btn-modal-confirm theme-bg" 
              onClick={handleSimulatePayment}
              disabled={paymentTimeLeft === 0}
              style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: 'none', color: '#fff', cursor: paymentTimeLeft === 0 ? 'not-allowed' : 'pointer', opacity: paymentTimeLeft === 0 ? 0.5 : 1 }}
            >
              จำลองว่าชำระเงินสำเร็จแล้ว
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal จองสำเร็จ */}
      {activeModal === 'success' && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 className="modal-title">ลงทะเบียนสำเร็จ!</h2>
            <p style={{ marginTop: '8px', color: '#666' }}>ระบบได้ส่งรายละเอียดไปยังอีเมลของคุณแล้ว</p>
            
            <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', margin: '24px 0' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>รหัสอ้างอิงการจอง (Ref Code)</p>
              <h3 className="theme-text" style={{ margin: 0, letterSpacing: '1px' }}>{refCode}</h3>
            </div>

            <button 
              className="btn-modal-confirm theme-bg" 
              onClick={() => {
                setActiveModal(null);
                // navigate('/'); // เปิดใช้บรรทัดนี้ถ้าต้องการให้พากลับหน้าแรกทันที
              }}
              style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}