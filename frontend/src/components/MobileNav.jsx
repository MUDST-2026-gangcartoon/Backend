
import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';
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
  const links = [
    { to: '/UpcomingEventsPage', label: 'ค้นหาอีเวนต์', icon: 'search' },
    ...(isLoggedIn
      ? [
          { to: '/MyRegistrationsPage', label: 'การลงทะเบียนของฉัน', icon: 'list' },
          { to: '/MyTicketsPage', label: 'ตั๋วของฉัน', icon: 'ticket' },
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
        <Icon name={isOpen ? 'close' : 'menu'} size="1.4em" strokeWidth={2} />
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
                  <Icon name={item.icon} size="1.2em" />
                </span>
                <span>{item.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">
                  <Icon name="chevronRight" size="1em" />
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
