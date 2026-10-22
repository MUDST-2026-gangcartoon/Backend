import React, { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// ไอคอนแบบเส้น ใช้สีตาม currentColor เพื่อให้เปลี่ยนตามสถานะแท็บ
const icons = {
  events: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" strokeLinecap="round" />
    </>
  ),
  checkin: (
    <>
      <path
        d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"
        strokeLinecap="round"
      />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  browse: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" strokeLinecap="round" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.9-3.6 3.7-5.5 7.5-5.5s6.6 1.9 7.5 5.5" strokeLinecap="round" />
    </>
  ),
};

function TabIcon({ name }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

export default function BottomTabBar() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetId = useId();
  const sheetRef = useRef(null);

  const role = String(user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const visible = isLoggedIn && (isAdmin || isStaff);

  // เว้นพื้นที่ด้านล่างของหน้าไม่ให้แถบแท็บบังเนื้อหา
  useEffect(() => {
    if (!visible) return undefined;
    document.body.classList.add('has-bottom-tabs');
    return () => document.body.classList.remove('has-bottom-tabs');
  }, [visible]);

  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sheetOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  if (!visible) return null;

  const tabs = isAdmin
    ? [
        { to: '/admin/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
        { to: '/manage-events', label: 'อีเวนต์', icon: 'events' },
      ]
    : [
        { to: '/staff/checkin', label: 'เช็กอิน', icon: 'checkin' },
      ];

  const handleLogout = async () => {
    setSheetOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <nav className="bottom-tabs" aria-label="เมนูหลัก">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `bottom-tab${isActive ? ' is-active' : ''}`
            }
          >
            <TabIcon name={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`bottom-tab${sheetOpen ? ' is-active' : ''}`}
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
          onClick={() => setSheetOpen((open) => !open)}
        >
          <TabIcon name="account" />
          <span>บัญชี</span>
        </button>
      </nav>

      {sheetOpen && (
        <>
          <div
            className="bottom-sheet-backdrop"
            onClick={() => setSheetOpen(false)}
          />
          <div
            id={sheetId}
            ref={sheetRef}
            className="bottom-sheet"
            role="dialog"
            aria-label="บัญชีผู้ใช้"
          >
            <div className="bottom-sheet-grip" aria-hidden="true" />

            <div className="bottom-sheet-user">
              <div className="bottom-sheet-avatar">
                {user?.avatarLetter || 'U'}
              </div>
              <div>
                <strong>{user?.username || 'ผู้ใช้งาน'}</strong>
                <span>{user?.roleLabel || role}</span>
              </div>
            </div>

            <button
              type="button"
              className="bottom-sheet-row danger"
              onClick={handleLogout}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 8l-4 4 4 4M6 12h10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
