import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const ROUTES = [
  { path: '/admin/dashboard', label: 'แดชบอร์ด (แอดมิน)' },
  { path: '/manage-events', label: 'จัดการอีเวนต์ (แอดมิน)' },
  // { path: '/registrants', label: 'ผู้ลงทะเบียนทั้งหมด (แอดมิน)' },
  { path: '/staff/checkin', label: 'เลือกอีเวนต์เช็กอิน (ทีมหน้างาน)' },
];

/**
 * Dev-only helper: since the admin portal and the staff (หน้างาน) portal
 * are separate apps in real life, there's no in-UI link between them.
 * This floating switcher just makes every route reachable while testing
 * locally, without typing URLs by hand. Safe to delete once you deploy
 * the two portals separately.
 */
export default function DevRouteSwitcher() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 999 }}>
      {open && (
        <div
          style={{
            marginBottom: 8,
            background: '#1E1B2E',
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 220,
          }}
        >
          {ROUTES.map((r) => (
            <NavLink
              key={r.path}
              to={r.path}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                color: isActive ? '#FFCB3D' : '#fff',
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              })}
            >
              {r.label}
            </NavLink>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: 'none',
          background: '#E8A400',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 8px 18px rgba(232,164,0,0.45)',
        }}
        title="ไปหน้าอื่น (dev only)"
      >
        🧭
      </button>
    </div>
  );
}
