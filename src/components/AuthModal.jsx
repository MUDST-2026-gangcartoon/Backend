import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal() {
  const { modal, closeModal, login, register } = useAuth();

  if (!modal) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    login();
  };

  const handleRegister = (e) => {
    e.preventDefault();
    register();
  };

  return (
    <div className="auth-modal-overlay" onClick={closeModal}>
      {modal === 'login' && (
        <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
          <button className="btn-close-modal" onClick={closeModal}>
            ✕
          </button>
          <div className="login-icon">
            <img src="https://via.placeholder.com/48/93C5FD/FFFFFF?text=+" alt="Icon" />
          </div>
          <div className="login-subtitle">สำหรับสมาชิก</div>
          <h1 className="login-title">เข้าสู่ระบบเพื่อลงทะเบียน</h1>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>อีเมล</label>
              <input type="email" required />
            </div>
            <div className="form-group">
              <label>รหัสผ่าน</label>
              <input type="password" required />
            </div>
            <button type="submit" className="btn-submit-login">
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="login-footer">
            ยังไม่มีบัญชี Petopia?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); register(); }}>
              สร้างบัญชีใหม่
            </a>
          </div>
        </div>
      )}

      {modal === 'register' && (
        <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
          <button className="btn-close-modal" onClick={closeModal}>
            ✕
          </button>
          <div className="login-icon">
            <img src="\assets\public\logo.png" alt="EventFest." />
          </div>
          <div className="login-subtitle" style={{ color: '#10B981' }}>
            สมัครสมาชิก
          </div>
          <h1 className="login-title">สร้างบัญชีของคุณ</h1>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>ชื่อที่แสดง</label>
              <input type="text" required />
            </div>
            <div className="form-group">
              <label>อีเมล</label>
              <input type="email" required />
            </div>
            <div className="form-group">
              <label>รหัสผ่าน</label>
              <input type="password" required minLength={8} />
            </div>
            <button type="submit" className="btn-submit-register">
              สร้างบัญชีและเริ่มจอง
            </button>
          </form>

          <div className="login-footer">
            มีบัญชีอยู่แล้ว?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); login(); }}>
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
