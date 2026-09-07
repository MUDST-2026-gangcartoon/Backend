import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import './MyTicketsPage.css';

// ข้อมูลจำลองรายการตั๋ว
const mockTicketsData = [
  {
    ticketId: "GTH-7A8BC42012",
    eventName: "Pet Expo",
    badgeText: "ออกแบบ - วันที่ 1/1",
    dateTime: "พุธ 20 ส.ค. 2570 - 10:00",
    location: "Central ladprao ชั้น 5",
    ticketType: "Pet Expo - Free",
    issueDate: "เสาร์ 22 ส.ค. 2569"
  },
  {
    ticketId: "T-SPRING-002",
    eventName: "Spring Boot สำหรับระบบที่ขยายได้",
    badgeText: "ไอที - วันที่ 1/1",
    dateTime: "เสาร์ 25 ส.ค. 2570 - 13:30",
    location: "Engineering Lab 3",
    ticketType: "Standard - Free",
    issueDate: "อาทิตย์ 23 ส.ค. 2569"
  }
];

export default function MyTicketsPage() {
  // State สำหรับเก็บ QR ที่ถูกกดเพื่อเปิด Modal ขยายใหญ่
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <>
      <Navbar />

      <main className="tickets-container">
        {/* Header หัวข้อหน้า */}
        <div className="tickets-header">
          <div className="text-blue-tag">บัตรพร้อมใช้งาน</div>
          <h1>ตั๋วของฉัน</h1>
          <p>บัตรทุกใบมี QR ของตัวเอง แตะ QR เพื่อขยายแล้วแสดงให้ทีมงานสแกน</p>
        </div>

        {/* Container แสดงรายการตั๋ว */}
        <div className="tickets-list">
          {mockTicketsData.length === 0 ? (
            <div className="empty-state">คุณยังไม่มีตั๋วในขณะนี้</div>
          ) : (
            mockTicketsData.map((ticket) => {
              // ดึงรูป QR Code อัตโนมัติจาก ticketId
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${ticket.ticketId}`;

              return (
                <div key={ticket.ticketId} className="ticket-card">
                  
                  {/* ซ้าย: แถบเน้นสีฟ้า + ชื่ออีเวนต์ */}
                  <div className="ticket-left">
                    <span className="ticket-badge">{ticket.badgeText}</span>
                    <h2 className="ticket-event-title">{ticket.eventName}</h2>
                  </div>

                  {/* กลาง: รายละเอียด */}
                  <div className="ticket-middle">
                    <div className="info-group">
                      <label>วันและเวลา</label>
                      <span>{ticket.dateTime}</span>
                    </div>
                    <div className="info-group">
                      <label>สถานที่</label>
                      <span>{ticket.location}</span>
                    </div>
                    <div className="info-group">
                      <label>ประเภทบัตร</label>
                      <span>{ticket.ticketType}</span>
                    </div>
                    <div className="info-group issue-date">
                      <label>ออกบัตรเมื่อ {ticket.issueDate}</label>
                    </div>
                  </div>

                  {/* ขวา: QR Code */}
                  <div 
                    className="ticket-right"
                    onClick={() => setSelectedTicket({ ...ticket, qrCodeUrl })}
                  >
                    <img src={qrCodeUrl} alt="QR Code" className="ticket-qr-img" />
                    <div className="ticket-id">{ticket.ticketId}</div>
                    <div className="ticket-tap-hint">🔍 แตะเพื่อขยาย QR</div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* 🔍 Pop-up Modal เมื่อแตะที่ QR Code */}
        {selectedTicket && (
          <div className="qr-modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{selectedTicket.eventName}</h3>
              <p className="modal-ticket-id">รหัสบัตร: {selectedTicket.ticketId}</p>
              
              <div className="modal-qr-wrapper">
                <img src={selectedTicket.qrCodeUrl} alt="QR Code ใหญ่" />
              </div>
              
              <p className="modal-hint">ยื่น QR Code นี้ให้เจ้าหน้าที่สแกนบริเวณหน้างาน</p>
              
              <button className="btn-close-modal" onClick={() => setSelectedTicket(null)}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}