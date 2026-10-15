
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import logo from '../../assets/public/logo.png';

export default function StaffNavbar() {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <NavLink
            to="/"
            className="logo"
            aria-label="หน้าหลักค้นหาอีเวนต์"
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
            <div className="user-profile flex items-center">
              <div
                className="user-profile"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="avatar"
                  style={{
                    backgroundColor: '#bae6fd',
                    color: '#0369a1',
                  }}
                >
                  {user?.avatarLetter || 'S'}
                </div>

                <div className="user-info">
                  <div className="username">
                    {user?.username || 'Staff'}
                  </div>
                  <div className="role">
                    {user?.roleLabel || 'ทีมหน้างาน'}
                  </div>
                </div>

                <span
                  className="dropdown-icon"
                  style={{
                    transform: isDropdownOpen
                      ? 'rotate(180deg)'
                      : 'rotate(0deg)',
                    transition: '0.2s',
                  }}
                >
                  ▼
                </span>
              </div>

              {isDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <button
                    type="button"
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
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
