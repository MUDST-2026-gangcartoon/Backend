import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal() {
  const { modal, closeModal, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  if (!modal) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login(email, password);

    if (!result.success) {
      setLoginError(result.message);
      return;
    }

    setLoginError('');
    setEmail('');
    setPassword('');

    // หลัง Login ให้ไปยังหน้าแรกของแต่ละ Role
    if (result.user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (result.user?.role === 'staff') {
      navigate('/staff/checkin');
    } else {
      navigate('/');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    register();
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

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>อีเมล</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError('');
                }}
                placeholder="user@test.com"
              />
            </div>
            <div className="form-group">
              <label>รหัสผ่าน</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError('');
                }}
                placeholder="1234"
              />
            </div>

            {loginError && (
              <p className="helper-text err" role="alert">{loginError}</p>
            )}

            <button type="submit" className="btn-submit-login">
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="login-footer">
            Mock User: <b>user@test.com / 1234</b><br />
            Mock Admin: <b>admin@test.com / 1234</b><br />
            Mock Staff: <b>staff@test.com / 1234</b>
          </div>

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
          <button className="btn-close-modal" onClick={closeModal}>✕</button>
          <div className="login-icon">
            <img src="https://via.placeholder.com/48/D1FAE5/FFFFFF?text=+" alt="Icon" />
          </div>
          <div className="login-subtitle" style={{ color: '#10B981' }}>สมัครสมาชิก</div>
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
            <a href="#" onClick={(e) => { e.preventDefault(); closeModal(); }}>
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
