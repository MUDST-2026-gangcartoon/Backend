import React from 'react';
import Icon from '../components/Icon.jsx';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import AdminNavbar from '../components/AdminNavbar.jsx';
import StaffNavbar from '../components/StaffNavbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizeRole, homeForRole } from '../utils/roleAccess.js';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const role = isLoggedIn ? normalizeRole(user) : '';
  const NavbarForRole =
    role === 'admin' ? AdminNavbar : role === 'staff' ? StaffNavbar : Navbar;

  return (
    <>
      <NavbarForRole />
      <main
        style={{
          minHeight: '70vh',
          display: 'grid',
          placeItems: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <section>
          <div style={{ marginBottom: 12, color: '#70C5FF' }}>
            <Icon name="compass" size={56} strokeWidth={1.4} />
          </div>
          <h1 style={{ marginBottom: 8 }}>ไม่พบหน้านี้</h1>
          <p style={{ marginBottom: 20, color: '#64748b' }}>
            URL ที่เปิดไม่มีอยู่ในระบบ หรือหน้านี้อาจถูกย้ายแล้ว
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate(homeForRole(role), { replace: true })}>
            กลับหน้าหลัก
          </button>
        </section>
      </main>
    </>
  );
}
