
import React, { useEffect, useRef, useState } from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import logo from '../../assets/public/logo.png';

export default function AdminNavbar() {
  const { isLoggedIn, user, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef(null);
  const [looseQuery, setLooseQuery] = useState('');

  // หน้าที่ค้นหาในหน้าได้: ใช้ ?q= ร่วมกับตัวกรองในหน้า / หน้าอื่น: กด Enter เพื่อไปค้นในหน้าจัดการอีเวนต์
  const isDashboard = location.pathname === '/admin/dashboard';
  const isManage = location.pathname === '/manage-events';
  const searchesInPage = isDashboard || isManage;
  const searchValue = searchesInPage
    ? searchParams.get('q') || ''
    : looseQuery;

  const searchPlaceholder = isDashboard
    ? 'ค้นหาอีเวนต์หรือชื่อผู้ลงทะเบียน  ( / )'
    : isManage
      ? 'ค้นหาชื่อ สถานที่ หรือหมวดหมู่  ( / )'
      : 'ค้นหาอีเวนต์  ( / )';

  const handleSearchChange = (value) => {
    if (!searchesInPage) {
      setLooseQuery(value);
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('q', value);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && !searchesInPage && looseQuery.trim()) {
      navigate(`/manage-events?q=${encodeURIComponent(looseQuery.trim())}`);
      setLooseQuery('');
    }

    if (event.key === 'Escape') {
      handleSearchChange('');
      event.currentTarget.blur();
    }
  };

  // กด "/" เพื่อโฟกัสช่องค้นหาได้จากทุกที่ในหน้า (ยกเว้นตอนกำลังพิมพ์อยู่)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return;

      const tag = event.target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        event.target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

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
            >
              <circle cx="11" cy="11" r="8" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>

            <input
              ref={searchRef}
              type="text"
              value={searchValue}
              placeholder={searchPlaceholder}
              aria-label="ค้นหา"
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>

        <div className="nav-center">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            แดชบอร์ด
          </NavLink>

          <NavLink
            to="/manage-events"
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            จัดการอีเวนต์
          </NavLink>
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
            <div className="user-profile-container">
              <div
                className="user-profile"
                onClick={() =>
                  setIsDropdownOpen((previous) => !previous)
                }
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="avatar"
                  style={{
                    backgroundColor: '#bae6fd',
                    color: '#0369a1',
                  }}
                >
                  {user?.avatarLetter || 'A'}
                </div>

                <div className="user-info">
                  <div className="username">
                    {user?.username || 'Admin'}
                  </div>

                  <div className="role">
                    {user?.roleLabel || 'ผู้ดูแลระบบ'}
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

      {/* มือถือ: แถบแท็บด้านล่างแทน hamburger */}
      <BottomTabBar />

      <AuthModal />
    </>
  );
}
