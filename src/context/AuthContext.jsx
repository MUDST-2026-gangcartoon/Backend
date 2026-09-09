import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const MOCK_ACCOUNTS = {
  'user@test.com': {
    username: 'User',
    role: 'user',
    roleLabel: 'ผู้ใช้งานทั่วไป',
    avatarLetter: 'U',
    password: '1234',
  },
  'admin@test.com': {
    username: 'Admin',
    role: 'admin',
    roleLabel: 'ผู้ดูแลระบบ',
    avatarLetter: 'A',
    password: '1234',
  },
  'staff@test.com': {
    username: 'Staff',
    role: 'staff',
    roleLabel: 'ทีมหน้างาน',
    avatarLetter: 'S',
    password: '1234',
  },
};

function getStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('mockUser') || 'null');
    return stored && stored.role ? stored : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );
  const [user, setUser] = useState(getStoredUser);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    // ล้างสถานะ login เก่าที่ไม่มี role เพื่อไม่ให้สิทธิ์เก่าค้าง
    if (isLoggedIn && !user) {
      localStorage.setItem('isLoggedIn', 'false');
      setIsLoggedIn(false);
    }
  }, [isLoggedIn, user]);

  const openModal = useCallback((type) => setModal(type), []);
  const closeModal = useCallback(() => setModal(null), []);

  const login = useCallback((email, password) => {
    const account = MOCK_ACCOUNTS[email.trim().toLowerCase()];

    if (!account || account.password !== password) {
      return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }

    const nextUser = {
      username: account.username,
      role: account.role,
      roleLabel: account.roleLabel,
      avatarLetter: account.avatarLetter,
    };

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('mockUser', JSON.stringify(nextUser));
    setIsLoggedIn(true);
    setUser(nextUser);
    setModal(null);

    return { success: true, user: nextUser };
  }, []);

  const register = useCallback(() => {
    alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    setModal('login');
  }, []);

  const logout = useCallback(() => {
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('mockUser');
    setIsLoggedIn(false);
    setUser(null);
    setModal(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, modal, openModal, closeModal, login, register, logout }}
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
