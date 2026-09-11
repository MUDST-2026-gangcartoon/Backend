import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar'; // 👈 1. Import Navbar เข้ามา
import './MyRegistrationsPage.css';

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

export default function MyRegistrationsPage() {
  return (
    <>
      {/* 👈 2. เรียกใช้ Navbar ไว้บนสุดของหน้า */}
      <Navbar /> 

      <main className="registrations-container">
        {/* Header หัวข้อหน้า */}
        <div className="page-header">
          <h1>การลงทะเบียนของฉัน</h1>
          <p>รายการอีเวนต์ทั้งหมดที่คุณลงทะเบียนเข้าร่วมไว้</p>
        </div>

        {/* Container แสดงรายการการลงทะเบียน */}
        <div className="registrations-list">
          {mockUserRegistrations.length === 0 ? (
            <div className="empty-state">
              ยังไม่มีรายการลงทะเบียนอีเวนต์ในขณะนี้
            </div>
          ) : (
            mockUserRegistrations.map((item) => (
              <div key={item.ticketId} className="registration-card">
                
                {/* ข้อมูลด้านซ้าย (วันที่ + รายละเอียด) */}
                <div className="reg-left-info">
                  <div className="reg-date-badge">
                    <span className="reg-month">{item.month}</span>
                    <span className="reg-day">{item.day}</span>
                  </div>
                  <div className="reg-details">
                    <div className="reg-title">{item.title}</div>
                    <div className="reg-meta">
                      <span>🕒 {item.time}</span>
                      <span>📍 {item.location}</span>
                    </div>
                  </div>
                </div>

                {/* สถานะ และ ปุ่มด้านขวา */}
                <div className="reg-right-actions">
                  <span className={`status-pill ${item.status}`}>
                    {item.statusText}
                  </span>
                  
                  {/* ปุ่มเชื่อมไปหน้าตั๋ว */}
                  <Link to={`/MyTicketsPage?ticketId=${item.ticketId}`} className="btn-view-ticket">
                    ดูตั๋วของฉัน →
                  </Link>
                </div>

              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}