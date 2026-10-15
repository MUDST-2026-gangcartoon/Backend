import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { authService } from '../api/authService.js';

const AuthContext = createContext(null);
const USER_KEY = 'authUser';

function getResponseLayers(payload) {
  const layers = [];
  let current = payload;

  for (let i = 0; i < 4 && current && typeof current === 'object'; i++) {
    layers.push(current);

    if (current.data && typeof current.data === 'object') {
      current = current.data;
    } else if (current.result && typeof current.result === 'object') {
      current = current.result;
    } else {
      break;
    }
  }

  return layers;
}

function extractUser(payload) {
  for (const layer of getResponseLayers(payload)) {
    const candidate = layer.user ?? layer.profile ?? layer.account;

    if (candidate && typeof candidate === 'object') {
      return candidate;
    }

    if (
      layer.role ||
      layer.userRole ||
      layer.roles ||
      layer.authorities
    ) {
      return layer;
    }
  }

  return null;
}

function normalizeUser(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  const roles = Array.isArray(rawUser.roles) ? rawUser.roles : [];
  const authorities = Array.isArray(rawUser.authorities)
    ? rawUser.authorities
    : [];

  const roleValue =
    rawUser.role ??
    rawUser.userRole ??
    roles[0] ??
    authorities[0]?.authority;

  const roleText =
    typeof roleValue === 'object'
      ? roleValue?.authority ?? roleValue?.name
      : roleValue;

  const role = String(roleText ?? '')
    .toLowerCase()
    .replace(/^role_/, '');

  if (!['user', 'admin', 'staff'].includes(role)) {
    return null;
  }

  const username =
    rawUser.name ??
    rawUser.username ??
    rawUser.displayName ??
    rawUser.fullName ??
    rawUser.email ??
    'User';

  const roleLabels = {
    user: 'ผู้ใช้งานทั่วไป',
    admin: 'ผู้ดูแลระบบ',
    staff: 'ทีมหน้างาน',
  };

  return {
    id: rawUser.id ?? rawUser.userId ?? null,
    username,
    email: rawUser.email ?? '',
    role,
    roleLabel: roleLabels[role],
    avatarLetter: String(username).charAt(0).toUpperCase(),
  };
}

function getStoredUser() {
  try {
    return normalizeUser(
      JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    );
  } catch {
    return null;
  }
}

function persistUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('isLoggedIn', 'true');

  // ล้างข้อมูลจากระบบ Mock/JWT รุ่นก่อน
  localStorage.removeItem('authToken');
  localStorage.removeItem('mockUser');
}

function clearStoredAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('authToken');
  localStorage.removeItem('mockUser');
  localStorage.setItem('isLoggedIn', 'false');
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(getStoredUser()?.role)
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [sessionCheckKey, setSessionCheckKey] = useState(0);

  const retrySessionCheck = useCallback(() => {
    setSessionCheckKey((current) => current + 1);
  }, []);


  // ตรวจสอบ Session จริงกับ Backend เมื่อเปิดหรือรีเฟรชเว็บ

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const response = await authService.getProfile();
        const currentUser = normalizeUser(extractUser(response));

        if (!currentUser) {
          throw new Error('Backend returned no valid user profile');
        }

        if (!active) return;

        persistUser(currentUser);
        setUser(currentUser);
        setIsLoggedIn(true);
        setAuthError(null);
      } catch (error) {
        if (!active) return;

        if (error?.status === 401) {
          // Session ใช้ไม่ได้: ล้างข้อมูล login ที่เก็บไว้
          clearStoredAuth();
          setUser(null);
          setIsLoggedIn(false);
          setAuthError(null);
        } else {
          // ปัญหาอื่น: ไม่ลบข้อมูลใน localStorage
          // แต่ไม่อนุญาตให้ Route Guard เชื่อข้อมูลผู้ใช้เก่า
          setUser(null);
          setIsLoggedIn(false);
          setAuthError(
            'ไม่สามารถตรวจสอบ session กับ Backend ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
          );
        }
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    };

    setIsAuthLoading(true);
    setAuthError(null);

    verifySession();

    return () => {
      active = false;
    };
  }, [sessionCheckKey]);


  const openModal = useCallback((type) => {
    setModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      let nextUser = normalizeUser(extractUser(response));

      // Backend อาจคืนข้อมูลผู้ใช้ไม่ครบ จึงลองดึง /auth/me
      if (!nextUser) {
        const profile = await authService.getProfile();
        nextUser = normalizeUser(extractUser(profile));
      }

      if (!nextUser) {
        throw new Error(
          'เข้าสู่ระบบแล้ว แต่ไม่พบ Role ของผู้ใช้จาก Backend'
        );
      }

      persistUser(nextUser);
      setUser(nextUser);
      setIsLoggedIn(true);
      setAuthError(null);
      setModal(null);

      return {
        success: true,
        user: nextUser,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(
          error,
          'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'
        ),
      };
    }
  }, []);

  const register = useCallback(async (details) => {
    try {
      const name = details?.name?.trim();
      const email = details?.email?.trim().toLowerCase();
      const password = details?.password;

      if (!name || !email || !password) {
        return {
          success: false,
          message: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ',
        };
      }

      const response = await authService.signup({
        name,
        email,
        password,
      });

      let nextUser = normalizeUser(extractUser(response));

      if (!nextUser) {
        const profile = await authService.getProfile();
        nextUser = normalizeUser(extractUser(profile));
      }

      if (!nextUser) {
        throw new Error('สมัครสำเร็จแต่ไม่พบข้อมูลผู้ใช้จาก Backend');
      }

      persistUser(nextUser);
      setUser(nextUser);
      setIsLoggedIn(true);
      setAuthError(null);
      setModal(null);

      return {
        success: true,
        user: nextUser,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(
          error,
          'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่'
        ),
      };
    }
  }, []);


  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      clearStoredAuth();
      setUser(null);
      setIsLoggedIn(false);
      setAuthError(null);
      setModal(null);
    }
  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isAuthLoading,
        authError,
        retrySessionCheck,
        modal,
        openModal,
        closeModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}