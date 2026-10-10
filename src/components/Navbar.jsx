import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import LanguageToggle from './LanguageToggle.jsx';

export default function Navbar({ onSearchChange }) {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 🟢 STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 🟢 HANDLERS
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/UpcomingEventsPage?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const getNavLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'ผู้ดูแลระบบ';
  const isStaff = userRole === 'staff' || userRole === 'พนักงาน';

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
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ สถานที่ หรือหัวข้อ" 
              value={searchQuery}
              onChange={(e) => {
                const text = e.target.value;
                setSearchQuery(text);
                if (onSearchChange) onSearchChange(text);
              }}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>

        {/* ตรงกลาง: เมนูสลับตาม Role */}
        <div className="nav-center">
          {isAdmin ? (
            <>
              <NavLink to="/admin/dashboard" className={getNavLinkClass}>แดชบอร์ด</NavLink>
              <NavLink to="/manage-events" className={getNavLinkClass}>จัดการอีเวนต์</NavLink>
            </>
          ) : isStaff ? (
            <span className="nav-link active">เช็กอินหน้างาน</span>
          ) : (
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

        {/* ด้านขวา: ปุ่มสลับภาษา + ปุ่มล็อกอิน/โปรไฟล์ */}
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* 🌟 ปุ่มสลับภาษา TH / EN แสดงผลเสมอทุก Role */}
          <LanguageToggle />

          {!isLoggedIn ? (
            <div id="nav-guest-view" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a href="#" className="btn-nav-register" onClick={(e) => { e.preventDefault(); openModal('register'); }}>
                สมัครสมาชิก
              </a>
              <a href="#" className="btn-nav-login" onClick={(e) => { e.preventDefault(); openModal('login'); }}>
                เข้าสู่ระบบ
              </a>
            </div>
          ) : (
            <div className="user-profile-container" style={{ position: 'relative' }}>
              <div 
                className="user-profile" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <div className="avatar">{user?.avatarLetter || 'U'}</div>
                <div className="user-info">
                  <div className="username">{user?.username}</div>
                  <div className="role">{user?.roleLabel || user?.role}</div>
                </div>
                <span className="dropdown-icon" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s', marginLeft: '8px' }}>▼</span>
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