import React, { useState } from 'react';
import Icon from './Icon.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import MobileNav from './MobileNav.jsx';

export default function Navbar({ onSearchChange }) {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // STATES
  const [searchQuery, setSearchQuery] = useState('');

  // HANDLERS
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(
        `/UpcomingEventsPage?search=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );
    }
  };


  const getNavLinkClass = ({ isActive }) =>
    `nav-link${isActive ? ' active' : ''}`;

  return (
    <>
      <nav className="navbar">
        {/* ด้านซ้าย: Logo + ช่องค้นหา */}
        <div className="nav-left">
          <NavLink to="/" className="logo">
            <img src="/assets/public/logo.png" alt="EventFest." />
          </NavLink>

          <div className="search-box">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
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

                if (onSearchChange) {
                  onSearchChange(text);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="ค้นหาอีเวนต์"
            />
          </div>
        </div>

        {/* ตรงกลาง: เมนูตาม Role */}
        <div className="nav-center">
          <NavLink to="/UpcomingEventsPage" className={getNavLinkClass}>
            ค้นหาอีเวนต์
          </NavLink>

          {isLoggedIn && (
            <>
              <NavLink to="/MyRegistrationsPage" className={getNavLinkClass}>
                การลงทะเบียนของฉัน
              </NavLink>

              <NavLink to="/MyTicketsPage" className={getNavLinkClass}>
                ตั๋วของฉัน
              </NavLink>

              <NavLink to="/payment-history" className={getNavLinkClass}>
                ประวัติการชำระเงิน
              </NavLink>
            </>
          )}
        </div>

        {/* ด้านขวา: ปุ่มเปลี่ยนภาษา + Login / Profile */}
        <div
          className="nav-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* ปุ่มเปลี่ยนภาษา */}
          <LanguageToggle />

          {!isLoggedIn ? (
            <div
              id="nav-guest-view"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <a
                href="#"
                className="btn-nav-register"
                onClick={(e) => {
                  e.preventDefault();
                  openModal('register');
                }}
              >
                สมัครสมาชิก
              </a>

              <a
                href="#"
                className="btn-nav-login"
                onClick={(e) => {
                  e.preventDefault();
                  openModal('login');
                }}
              >
                เข้าสู่ระบบ
              </a>
            </div>
          ) : (
            <ProfileMenu
              user={user}
              items={[
                { to: '/MyRegistrationsPage', label: 'การลงทะเบียนของฉัน', icon: 'list' },
                { to: '/MyTicketsPage', label: 'ตั๋วของฉัน', icon: 'ticket' },
                { to: '/profile', label: 'จัดการโปรไฟล์', icon: 'user' },
                { to: '/payment-history', label: 'ประวัติการชำระเงิน', icon: 'history' },
              ]}
              onLogout={logout}
            />
          )}
        </div>

        {/* Mobile Navigation - User / Admin */}
        <MobileNav />
      </nav>

      <AuthModal />
    </>
  );
}
