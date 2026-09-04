import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

export default function AdminNavbar() {
  const { isLoggedIn, user, openModal } = useAuth();

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <a className="logo" href="/admin/dashboard">
            <img src="/logo.png" alt="EVentFast" />
          </a>
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
              <button className="btn-lang-toggle">EN</button>
              <a href="#" className="btn-nav-register" onClick={(e) => { e.preventDefault(); openModal('register'); }}>
                สมัครสมาชิก
              </a>
              <a href="#" className="btn-nav-login" onClick={(e) => { e.preventDefault(); openModal('login'); }}>
                เข้าสู่ระบบ
              </a>
            </div>
          )}

          {isLoggedIn && (
            <div className="user-profile">
              <div className="lang-text">ไทย</div>
              <div className="avatar">{user.avatarLetter}</div>
              <div className="user-info">
                <div className="username">{user.username}</div>
                <div className="role">ผู้ดูแลระบบ</div>
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
