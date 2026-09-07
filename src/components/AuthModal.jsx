import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal() {
  // ดึง openModal มาใช้ด้วยเพื่อสลับหน้า
  const { modal, closeModal, openModal, login } = useAuth();

  // State สำหรับเก็บค่าฟอร์ม Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!modal) return null;

  const switchModal = (type) => {
    setErrorMsg(''); // ล้างข้อความ Error
    setEmail('');
    setPassword('');
    openModal(type); // สลับหน้าไป login หรือ register
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // ส่งอีเมลและรหัสผ่านไปเช็ก
    const success = login(email, password);
    if (!success) {
      setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง (ลอง user@test.com / 1234)');
    } else {
      setErrorMsg('');
      setEmail('');
      setPassword('');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    alert('ระบบจำลอง: สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    switchModal('login');
  };

  return (
    <div className="auth-modal-overlay" onClick={closeModal}>
      {modal === 'login' && (
        <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
          <button className="btn-close-modal" onClick={closeModal}>✕</button>
          <div className="login-icon">
            <img src="https://via.placeholder.com/48/93C5FD/FFFFFF?text=+" alt="Icon" />
          </div>
          <div className="login-subtitle">สำหรับสมาชิก</div>
          <h1 className="login-title">เข้าสู่ระบบเพื่อลงทะเบียน</h1>

          {/* แสดงแจ้งเตือนกรณีรหัสผิด */}
          {errorMsg && <div style={{ color: 'red', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{errorMsg}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>อีเมล</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น user@test.com"
                required 
              />
            </div>
            <div className="form-group">
              <label>รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="เช่น 1234"
                required 
              />
            </div>
            <button type="submit" className="btn-submit-login">
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="login-footer">
            ยังไม่มีบัญชีใช่ไหม?{' '}
            {/* 🔹 แก้ตรงนี้ให้ใช้ switchModal */}
            <a href="#" onClick={(e) => { e.preventDefault(); switchModal('register'); }}>
              สร้างบัญชีใหม่
            </a>
          </div>
        </div>
      )}

      {modal === 'register' && (
        <div className="auth-modal-box" onClick={(e) => e.stopPropagation()}>
          <button className="btn-close-modal" onClick={closeModal}>✕</button>
          <div className="login-icon">
            <img src="/assets/public/logo.png" alt="EventFest." />
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
            {/* 🔹 แก้ตรงนี้ให้ใช้ switchModal */}
            <a href="#" onClick={(e) => { e.preventDefault(); switchModal('login'); }}>
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}