import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import logo from '../../assets/public/logo.png';

export default function AdminNavbar() {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // State สำหรับจัดการเปลี่ยนภาษา (ไทย / EN)
  const [currentLang, setCurrentLang] = useState('ไทย');

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/');
  };

  const toggleLanguage = () => {
    setCurrentLang((prev) => (prev === 'ไทย' ? 'EN' : 'ไทย'));
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <NavLink to="/" className="logo" aria-label="หน้าหลักค้นหาอีเวนต์">
            <img src={logo} alt="EventFest." />
          </NavLink>
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="ค้นหาชื่อ สถานที่ หรือหัวข้อ" />
          </div>
        </div>

        <div className="nav-center">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            แดชบอร์ด
          </NavLink>
          <NavLink to="/manage-events" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            จัดการอีเวนต์
          </NavLink>
        </div>

        <div className="nav-right">
          {!isLoggedIn && (
            <div className="nav-auth-buttons">
              <button className="btn-lang-toggle" onClick={toggleLanguage}>
                {currentLang}
              </button>
              <a href="#" className="btn-nav-register" onClick={(e) => { e.preventDefault(); openModal('register'); }}>
                สมัครสมาชิก
              </a>
              <a href="#" className="btn-nav-login" onClick={(e) => { e.preventDefault(); openModal('login'); }}>
                เข้าสู่ระบบ
              </a>
            </div>
          )}

          {isLoggedIn && (
            <div className="user-profile flex items-center">
              {/* ปุ่มสลับภาษาและเส้นกั้นแนวตั้ง */}
              <button 
                className="lang-text bg-transparent border-none cursor-pointer font-medium px-2"
                onClick={toggleLanguage}
              >
                {currentLang}
              </button>
              <div className="lang-divider" style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 8px' }} />

              <div
                className="user-profile"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                <div className="avatar" style={{ backgroundColor: '#bae6fd', color: '#0369a1' }}>
                  {user?.avatarLetter || 'A'}
                </div>
                <div className="user-info">
                {/* บังคับแสดงคำว่า Staff และ สตาฟหน้างาน สำหรับหน้า Staff โดยเฉพาะ */}
                  <div className="username">{user?.username || 'Admin'}</div>
                  <div className="role">{user?.roleLabel || 'ผู้ดูแลระบบ'}</div>
                </div>
                <span className="dropdown-icon" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>▼</span>
              </div>

              {isDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <button type="button" className="dropdown-item logout-btn" onClick={handleLogout}>
                    🚪 ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <AuthModal />
    </>
  );
}
