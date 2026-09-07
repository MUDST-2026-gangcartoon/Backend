import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import './UpcomingEventsPage.css';

/* ===================================================
   📌 DATA MOCK
=================================================== */
const mockHeroData = {
  badgeText: "แนะนำ",
  title: "Pet Expo\nงานสัตว์เลี้ยงที่ใหญ่ที่สุด",
  dateTimeLocation: "พุธ, 20 ส.ค., 2570 - Central ladprao, ชั้น 5",
};

const mockEventsData = [
  {
    id: 1,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)",
    bannerText: "DESIGN LAB\nMAKE IT CLEAR.",
    month: "ส.ค.",
    day: "19",
    title: "ออกแบบเพื่อผู้คนจริง",
    description: "เวิร์กช็อปลงมือทำเพื่อเปลี่ยนอินไซด์จากรีเสิร์ชให้เป็นอินเทอร์เฟซที่คนเข้าใจและไว้วางใจ",
    time: "10:00",
    location: "Creative Hall อาคาร A",
    seatsLeft: 40,
  },
  {
    id: 2,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
    bannerText: "SPRING BOOT AT SCALE",
    month: "ส.ค.",
    day: "25",
    title: "Spring Boot สำหรับระบบที่ขยายได้",
    description: "เรียนรู้การสร้างบริการที่เสถียรด้วยขอบเขตธุรกิจ การสังเกตระบบ และสถาปัตยกรรมที่ใช้งานได้จริง",
    time: "13:30",
    location: "Engineering Lab 3",
    seatsLeft: 60,
  },
  {
    id: 3,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #172554 0%, #3b82f6 100%)", // ปรับเป็นโทนฟ้า
    bannerText: "PRODUCT NIGHT",
    month: "ส.ค.",
    day: "31",
    title: "คืนแห่งโปรดักต์ในมหาวิทยาลัย",
    description: "ทีมสตาร์ตอัพแชร์ต้นแบบ บทเรียน และเหตุผลเนื่องจากการตัดสินใจสร้างโปรดักต์",
    time: "17:30",
    location: "หอประชุมใหญ่",
    seatsLeft: 15,
  },
  {
    id: 4,
    statusBadge: "เปิดรับลงทะเบียน",
    bannerBg: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
    bannerText: "ACCESSIBILITY LAB",
    month: "ก.ย.",
    day: "7",
    title: "แล็บทดสอบเพื่อการเข้าถึง",
    description: "นำอินเทอร์เฟซของคุณมาทดสอบด้วยคีย์บอร์ด โปรแกรมอ่านหน้าจอ และเช็กลิสต์คอนทราสต์ที่ทำซ้ำได้",
    time: "09:00",
    location: "Digital Studio 2",
    seatsLeft: 25,
  }
];

export default function UpcomingEventsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("ทุกความสนใจ");
  const categories = ["ทุกความสนใจ", "เทคโนโลยี", "ออกแบบ", "อาชีพ", "คอมมูนิตี้"];

  const handleRegisterClick = (e, eventId) => {
    e.preventDefault();
    navigate(`/event-detail/${eventId}`);
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      
      <main className="events-home-container">
        {/* 🌟 Hero Section */}
        <section className="hero-section">
          <div className="hero-text">
            <p className="hero-subtitle">เหตุผลดี ๆ ที่จะได้มาเจอกัน</p>
            <h1 className="hero-title">ไอเดียที่ดี<br/>เริ่มต้นเมื่อเรา<br/>ออกมาเจอกัน</h1>
            <p className="hero-desc">ค้นหาเวิร์กช็อป ทอล์ก และกิจกรรมชุมชนที่คัดสรรมาเพื่อคนช่างสงสัย</p>
            <button className="btn-all-events">ดูอีเวนต์ทั้งหมด →</button>
          </div>
          
          <div className="hero-card-container">
            <div className="hero-card-content">
              <span className="hero-badge">{mockHeroData.badgeText}</span>
              <h2 className="hero-card-title">
                {mockHeroData.title.split('\n').map((text, i) => (
                  <React.Fragment key={i}>{text}<br /></React.Fragment>
                ))}
              </h2>
              <p className="hero-card-info">📅 {mockHeroData.dateTimeLocation}</p>
            </div>
            <button className="btn-circle-arrow">→</button>
          </div>
        </section>

        {/* 🏷️ Category Selection */}
        <section className="category-section">
          <p className="category-subtitle">เลือกตามความสนใจ</p>
          <h2 className="category-title">เลือกตามความสนใจ</h2>
          <div className="filter-pills">
            {categories.map((cat) => (
              <button 
                key={cat} 
                className={`pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ⭐ Gather Picks Banner */}
        <div className="gather-picks-banner">
          <div className="gather-left">
            <span className="gather-badge">PETOPIA PICKS</span>
            <h3 className="gather-title">อีเวนต์น่าสนใจประจำสัปดาห์</h3>
          </div>
          <span className="gather-arrow">→</span>
        </div>

        {/* 📅 Events Grid (2 Columns) */}
        <section className="events-grid">
          {mockEventsData.map((event) => (
            <div className="event-card" key={event.id}>
              <div className="card-banner" style={{ background: event.bannerBg }}>
                <span className="status-badge">{event.statusBadge}</span>
                <div className="banner-text">
                  {event.bannerText.split('\n').map((line, i) => (
                    <React.Fragment key={i}>{line}<br/></React.Fragment>
                  ))}
                </div>
              </div>

              <div className="card-body">
                <div className="date-box">
                  <span className="date-month">{event.month}</span>
                  <span className="date-day">{event.day}</span>
                </div>
                
                <div className="card-content">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-description">{event.description}</p>
                  
                  <div className="meta-info">
                    <span className="meta-item">🕒 {event.time}</span>
                    <span className="meta-item">📍 {event.location}</span>
                  </div>
                  
                  <div className="card-footer">
                    <span className="seats-count">{event.seatsLeft} ที่นั่งเหลือ</span>
                    <button 
                      onClick={(e) => handleRegisterClick(e, event.id)} 
                      className="btn-register"
                    >
                      ดูรายละเอียด / ลงทะเบียน →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}