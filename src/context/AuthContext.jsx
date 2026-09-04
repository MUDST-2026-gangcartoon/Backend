import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const mockUser = {
  username: 'User',
  role: 'ผู้ใช้งานทั่วไป',
  avatarLetter: 'U',
};

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modal, setModal] = useState(null); // null | 'login' | 'register'

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
  }, []);

  const openModal = useCallback((type) => setModal(type), []);
  const closeModal = useCallback(() => setModal(null), []);

  const login = useCallback(() => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
    setModal(null);
    alert('เข้าสู่ระบบสำเร็จ!');
  }, []);

  const register = useCallback(() => {
    alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    setModal('login');
  }, []);

  const logout = useCallback(() => {
    localStorage.setItem('isLoggedIn', 'false');
    setIsLoggedIn(false);
    alert('ออกจากระบบเรียบร้อยแล้ว');
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user: mockUser, modal, openModal, closeModal, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
