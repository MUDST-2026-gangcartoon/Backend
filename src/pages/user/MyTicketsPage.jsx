import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import './MyTicketsPage.css';

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
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <>
      <Navbar />

      <main className="tickets-container">
        <div className="tickets-header">
          <div className="text-blue-tag">บัตรพร้อมใช้งาน</div>
          <h1>ตั๋วของฉัน</h1>
          <p>บัตรทุกใบมี QR ของตัวเอง แตะ QR เพื่อขยายแล้วแสดงให้ทีมงานสแกน</p>
        </div>

        <div className="tickets-list">
          {mockTicketsData.length === 0 ? (
            <div className="empty-state">คุณยังไม่มีตั๋วในขณะนี้</div>
          ) : (
            mockTicketsData.map((ticket) => {
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.ticketId}`;

              return (
                <div className="ticket-card" key={ticket.ticketId}>
                  {/* 🔹 ฝั่งซ้าย: สีฟ้าแนวนอน ความสูงพอดี ป้ายติดข้างบนชื่ออีเวนต์ */}
                  <div className="ticket-left">
                    <div className="ticket-badge">{ticket.badgeText}</div>
                    <h2 className="ticket-event-title">{ticket.eventName}</h2>
                  </div>

                  {/* 🔹 ตรงกลาง: ข้อมูลเรียงบรรทัดแบบเรียบหรู */}
                  <div className="ticket-middle">
                    <div className="info-group">
                      <label>วันและเวลา</label>
                      <div className="info-value">{ticket.dateTime}</div>
                    </div>

                    <div className="info-group">
                      <label>สถานที่</label>
                      <div className="info-value">{ticket.location}</div>
                    </div>

                    <div className="info-group">
                      <label>ประเภทบัตร</label>
                      <div className="info-value">{ticket.ticketType}</div>
                    </div>

                    <div className="issue-date">
                      ออกบัตรเมื่อ {ticket.issueDate}
                    </div>
                  </div>

                  {/* 🔹 ฝั่งขวา: QR Code ตรงกลางขวา */}
                  <div className="ticket-right" onClick={() => setSelectedTicket(ticket)}>
                    <img src={qrCodeUrl} alt="QR Code" className="ticket-qr-img" />
                    <div className="ticket-id">{ticket.ticketId}</div>
                    <div className="ticket-tap-hint">แตะเพื่อขยาย QR</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal ขยาย QR Code */}
        {selectedTicket && (
          <div className="qr-modal-overlay" onClick={() => setSelectedTicket(null)}>
            <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{selectedTicket.eventName}</h3>
              <p className="modal-ticket-id">รหัสบัตร: {selectedTicket.ticketId}</p>
              
              <div className="modal-qr-wrapper">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${selectedTicket.ticketId}`} 
                  alt="QR Code ใหญ่" 
                />
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