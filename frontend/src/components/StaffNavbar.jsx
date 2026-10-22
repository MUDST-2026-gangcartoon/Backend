
import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import logo from '../../assets/public/logo.png';

export default function StaffNavbar() {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchText(params.get('search') || '');
  }, [location.search]);

  const handleSearch = (value) => {
    setSearchText(value);

    const params = new URLSearchParams(location.search);

    if (value.trim()) {
      params.set('search', value);
    } else {
      params.delete('search');
    }

    const query = params.toString();
    const nextUrl = `${location.pathname}${query ? `?${query}` : ''}`;

    navigate(nextUrl, { replace: true });
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <NavLink
            to="/staff/checkin"
            className="logo"
            aria-label="เช็กอินหน้างาน"
          >
            <img src={logo} alt="EventFest." />
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
              type="search"
              placeholder="ค้นหาชื่อ สถานที่ หรือหัวข้อ"
              aria-label="ค้นหาอีเวนต์"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="nav-center">
          <span className="nav-link active">เช็กอินหน้างาน</span>
        </div>

        <div className="nav-right">
          <LanguageToggle />

          {!isLoggedIn && (
            <div className="nav-auth-buttons">
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
          )}

          {isLoggedIn && (
            <ProfileMenu
              user={user}
              items={[
            { to: '/staff/checkin', label: 'เช็กอินหน้างาน', icon: 'scan' },
          ]}
              onLogout={logout}
            />
          )}
        </div>
      </nav>

      {/* มือถือ: แถบแท็บด้านล่าง */}
      <BottomTabBar />

      <AuthModal />
    </>
  );
}
