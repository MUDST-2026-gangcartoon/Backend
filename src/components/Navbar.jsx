import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

export default function Navbar() {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const location = useLocation();

  const getNavLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  // ดึง Role มาทำเป็นตัวพิมพ์เล็กเพื่อเช็กได้ง่ายขึ้น
  const userRole = user?.role?.toLowerCase() || '';

  // เช็กว่าเป็น Admin หรือไม่ (เช็กทั้งชื่อ Role และ URL Path)
  const isAdmin = 
    userRole === 'admin' || 
    userRole === 'ผู้ดูแลระบบ' || 
    location.pathname.startsWith('/admin') || 
    location.pathname === '/manage-events';

  // เช็กว่าเป็น Staff หรือไม่
  const isStaff = 
    userRole === 'staff' || 
    userRole === 'พนักงาน' || 
    location.pathname.startsWith('/staff') || 
    location.pathname.includes('checkin');

  return (
    <>
      <nav className="navbar">
        {/* ด้านซ้าย: Logo + ช่องค้นหา */}
        <div className="nav-left">
          <NavLink to="/" className="logo">
            <img src="/assets/public/logo.png" alt="EventFest." />
          </NavLink>
          
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="ค้นหาชื่อ สถานที่ หรือหัวข้อ" />
          </div>
        </div>

        {/* ตรงกลาง: เมนูสลับตาม Role */}
        <div className="nav-center">
          {isAdmin ? (
            /* 🟢 1. เมนูของผู้ดูแลระบบ (Admin) */
            <>
              <NavLink to="/admin/dashboard" className={getNavLinkClass}>แดชบอร์ด</NavLink>
              <NavLink to="/manage-events" className={getNavLinkClass}>จัดการอีเวนต์</NavLink>
            </>
          ) : isStaff ? (
            /* 🟢 2. เมนูของพนักงาน (Staff) */
            <span className="nav-link active">เช็กอินหน้างาน</span>
          ) : (
            /* 🟢 3. เมนูของผู้ใช้งานทั่วไป (User) */
            <>
              <NavLink to="/UpcomingEventsPage" className={getNavLinkClass}>ค้นหาอีเวนต์</NavLink>
              {isLoggedIn && (
                <>
                  <NavLink to="/MyRegistrationsPage" className={getNavLinkClass}>การลงทะเบียนของฉัน</NavLink>
                  <NavLink to="/MyTicketsPage" className={getNavLinkClass}>ตั๋วของฉัน</NavLink>
                </>
              )}
            </>
          )}
        </div>

        {/* ด้านขวา: ปุ่มล็อกอิน / โปรไฟล์ */}
        <div className="nav-right">
          {!isLoggedIn ? (
            <div id="nav-guest-view">
              <button className="btn-lang-toggle">EN</button>
              <a href="#" className="btn-nav-register" onClick={(e) => { e.preventDefault(); openModal('register'); }}>
                สมัครสมาชิก
              </a>
              <a href="#" className="btn-nav-login" onClick={(e) => { e.preventDefault(); openModal('login'); }}>
                เข้าสู่ระบบ
              </a>
            </div>
          ) : (
            <div className="user-profile" onClick={logout} title="คลิกเพื่อออกจากระบบ">
              <div className="lang-text">ไทย</div>
              <div className="avatar">{user?.avatarLetter || 'U'}</div>
              <div className="user-info">
                <div className="username">{user?.username}</div>
                <div className="role">{user?.role}</div>
              </div>
              <span className="dropdown-icon">▼</span>
            </div>
          )}
        </div>
      </nav>

      <AuthModal />
    </>
  );
}