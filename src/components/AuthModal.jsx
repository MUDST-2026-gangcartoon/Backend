import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal() {
  const {
    modal,
    closeModal,
    openModal,
    login,
    register,
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!modal) return null;

  const navigateByRole = (role) => {
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'staff') {
      navigate('/staff/checkin');
    } else {
      navigate('/');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoginError('');

    try {
      const result = await login(email, password);

      if (!result?.success) {
        setLoginError(
          result?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'
        );
        return;
      }

      setEmail('');
      setPassword('');
      navigateByRole(result.user?.role);
    } catch (error) {
      setLoginError(
        error?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (isRegistering) return;

    setIsRegistering(true);
    setRegisterError('');

    try {
      const result = await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      if (!result?.success) {
        setRegisterError(
          result?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่'
        );
        return;
      }

      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');

      // Backend สมัครสมาชิกแล้วเข้าสู่ระบบให้ทันที
      navigateByRole(result.user?.role);
    } catch (error) {
      setRegisterError(
        error?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const switchModal = (type) => {
    setLoginError('');
    setRegisterError('');
    openModal(type);
  };

  return (
    <div
      className="auth-modal-overlay"
      onClick={closeModal}
    >
      {modal === 'login' && (
        <div
          className="auth-modal-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-close-modal"
            onClick={closeModal}
            aria-label="ปิดหน้าต่าง"
          >
            ✕
          </button>

          <div className="login-icon">
            <img
              src="https://via.placeholder.com/48/93C5FD/FFFFFF?text=+"
              alt=""
            />
          </div>

          <div className="login-subtitle">สำหรับสมาชิก</div>

          <h1 className="login-title" id="login-title">
            เข้าสู่ระบบเพื่อลงทะเบียน
          </h1>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">อีเมล</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError('');
                }}
                placeholder="กรอกอีเมลของคุณ"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">รหัสผ่าน</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError('');
                }}
                placeholder="กรอกรหัสผ่าน"
              />
            </div>

            {loginError && (
              <p className="helper-text err" role="alert">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="btn-submit-login"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="login-footer">
            ยังไม่มีบัญชี Petopia?{' '}
            <a
              href="#register"
              onClick={(e) => {
                e.preventDefault();
                switchModal('register');
              }}
            >
              สร้างบัญชีใหม่
            </a>
          </div>
        </div>
      )}

      {modal === 'register' && (
        <div
          className="auth-modal-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-close-modal"
            onClick={closeModal}
            aria-label="ปิดหน้าต่าง"
          >
            ✕
          </button>

          <div className="login-icon">
            <img
              src="https://via.placeholder.com/48/D1FAE5/FFFFFF?text=+"
              alt=""
            />
          </div>

          <div
            className="login-subtitle"
            style={{ color: '#10B981' }}
          >
            สมัครสมาชิก
          </div>

          <h1 className="login-title" id="register-title">
            สร้างบัญชีของคุณ
          </h1>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="register-name">ชื่อที่แสดง</label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                value={registerName}
                onChange={(e) => {
                  setRegisterName(e.target.value);
                  setRegisterError('');
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-email">อีเมล</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={registerEmail}
                onChange={(e) => {
                  setRegisterEmail(e.target.value);
                  setRegisterError('');
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">รหัสผ่าน</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={100}
                required
                value={registerPassword}
                onChange={(e) => {
                  setRegisterPassword(e.target.value);
                  setRegisterError('');
                }}
              />
            </div>

            {registerError && (
              <p className="helper-text err" role="alert">
                {registerError}
              </p>
            )}

            <button
              type="submit"
              className="btn-submit-register"
              disabled={isRegistering}
            >
              {isRegistering
                ? 'กำลังสมัครสมาชิก...'
                : 'สร้างบัญชีและเริ่มจอง'}
            </button>
          </form>

          <div className="login-footer">
            มีบัญชีอยู่แล้ว?{' '}
            <a
              href="#login"
              onClick={(e) => {
                e.preventDefault();
                switchModal('login');
              }}
            >
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}