import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

// 📌 ฝังบัญชีจำลองสำหรับใช้ทดสอบ 3 Roles
const TEST_USERS = [
  { email: 'user@test.com', password: '1234', username: 'General User', role: 'User', avatarLetter: 'U' },
  { email: 'staff@test.com', password: '1234', username: 'Event Staff', role: 'Staff', avatarLetter: 'S' },
  { email: 'admin@test.com', password: '1234', username: 'System Admin', role: 'Admin', avatarLetter: 'A' }
];

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null); // เปลี่ยนจาก mockUser ตายตัว มาเก็บใน State แทน
  const [modal, setModal] = useState(null); // null | 'login' | 'register'

  // ดึงสถานะและข้อมูล User จาก localStorage ตอนโหลดหน้าเว็บ
  useEffect(() => {
    const storedLoginStatus = localStorage.getItem('isLoggedIn') === 'true';
    const storedUserData = localStorage.getItem('user');

    if (storedLoginStatus && storedUserData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUserData));
    }
  }, []);

  const openModal = useCallback((type) => setModal(type), []);
  const closeModal = useCallback(() => setModal(null), []);

  // 🟢 ฟังก์ชันล็อกอิน: รับค่า email, password มาตรวจสอบ
  const login = useCallback((email, password) => {
    // หา user ที่ตรงกับ email และ password
    const foundUser = TEST_USERS.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(foundUser)); // เซฟข้อมูล user ไว้
      setIsLoggedIn(true);
      setUser(foundUser);
      setModal(null);
      return true; // ล็อกอินสำเร็จ
    }
    return false; // ล็อกอินไม่สำเร็จ
  }, []);

  // 🟢 ฟังก์ชันสมัครสมาชิก
  const register = useCallback(() => {
    alert('ระบบจำลอง: สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    setModal('login'); // สลับไปหน้าล็อกอิน
  }, []);

  // 🟢 ฟังก์ชันออกจากระบบ
  const logout = useCallback(() => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user'); // ลบข้อมูล user ออก
    setIsLoggedIn(false);
    setUser(null);
    alert('ออกจากระบบเรียบร้อยแล้ว');
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