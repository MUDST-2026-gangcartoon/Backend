
import React, { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function MobileNav() {
  const {
    isLoggedIn,
    isAuthLoading,
    user,
    openModal,
    logout,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef(null);

  const role = String(user?.role || '').toLowerCase();

  // เมนูตาม Role จริงที่ได้จาก AuthContext
  const links =
    isLoggedIn && role === 'admin'
      ? [
          { to: '/admin/dashboard', label: 'แดชบอร์ด', icon: '📊' },
          { to: '/manage-events', label: 'จัดการอีเวนต์', icon: '📅' },
          { to: '/staff/checkin', label: 'เช็กอินหน้างาน', icon: '📷' },
          { to: '/UpcomingEventsPage', label: 'ค้นหาอีเวนต์', icon: '🔎' },
        ]
      : isLoggedIn && role === 'staff'
        ? [
            { to: '/staff/checkin', label: 'เช็กอินหน้างาน', icon: '📷' },
            { to: '/UpcomingEventsPage', label: 'ค้นหาอีเวนต์', icon: '🔎' },
          ]
        : [
            { to: '/UpcomingEventsPage', label: 'ค้นหาอีเวนต์', icon: '🔎' },
            ...(isLoggedIn && role === 'user'
              ? [
                  {
                    to: '/MyRegistrationsPage',
                    label: 'การลงทะเบียนของฉัน',
                    icon: '📋',
                  },
                  {
                    to: '/MyTicketsPage',
                    label: 'ตั๋วของฉัน',
                    icon: '🎟️',
                  },
                ]
              : []),
          ];

  // เปลี่ยนหน้าแล้วปิดเมนู
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // กด Escape หรือกดพื้นที่นอกเมนูเพื่อปิด
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsideClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  const openAuthModal = (type) => {
    setIsOpen(false);
    openModal(type);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="mobile-nav-wrap" ref={menuRef}>
      <button
        type="button"
        className={`mobile-nav-toggle${isOpen ? ' is-open' : ''}`}
        aria-label={isOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span aria-hidden="true">{isOpen ? '✕' : '☰'}</span>
      </button>

      {isOpen && (
        <div
          id={menuId}
          className="mobile-nav-panel"
          aria-label="เมนูนำทางมือถือ"
        >
          {isLoggedIn && (
            <div className="mobile-nav-user">
              <div className="mobile-nav-avatar">
                {user?.avatarLetter || 'U'}
              </div>
              <div>
                <strong>{user?.username || 'ผู้ใช้งาน'}</strong>
                <span>{user?.roleLabel || role}</span>
              </div>
            </div>
          )}

          <div className="mobile-nav-links">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `mobile-nav-link${isActive ? ' is-active' : ''}`
                }
                onClick={() => setIsOpen(false)}
              >
                <span className="mobile-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">
                  ›
                </span>
              </NavLink>
            ))}
          </div>

          {!isAuthLoading && (
            <div className="mobile-nav-actions">
              {isLoggedIn ? (
                <button
                  type="button"
                  className="mobile-nav-action logout"
                  onClick={handleLogout}
                >
                  ออกจากระบบ
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="mobile-nav-action register"
                    onClick={() => openAuthModal('register')}
                  >
                    สมัครสมาชิก
                  </button>
                  <button
                    type="button"
                    className="mobile-nav-action login"
                    onClick={() => openAuthModal('login')}
                  >
                    เข้าสู่ระบบ
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
