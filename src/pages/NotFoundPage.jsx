import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
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
          <div style={{ fontSize: 56, marginBottom: 12 }}>🐾</div>
          <h1 style={{ marginBottom: 8 }}>ไม่พบหน้านี้</h1>
          <p style={{ marginBottom: 20, color: '#64748b' }}>
            URL ที่เปิดไม่มีอยู่ในระบบ หรือหน้านี้อาจถูกย้ายแล้ว
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            กลับหน้าหลัก
          </button>
        </section>
      </main>
    </>
  );
}
