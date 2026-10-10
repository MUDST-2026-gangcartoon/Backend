
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { authService } from '../api/authService.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user?.role ? user : null;
  } catch {
    return null;
  }
}

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

function extractToken(payload) {
  for (const layer of getResponseLayers(payload)) {
    const token =
      layer.accessToken ??
      layer.access_token ??
      layer.token ??
      layer.jwt;

    if (typeof token === 'string' && token.length > 0) {
      return token;
    }
  }

  return null;
}

function extractUser(payload) {
  for (const layer of getResponseLayers(payload)) {
    const candidate = layer.user ?? layer.profile ?? layer.account;

    if (candidate && typeof candidate === 'object') {
      return candidate;
    }

    if (layer.role || layer.userRole || layer.roles || layer.authorities) {
      return layer;
    }
  }

  return null;
}

function normalizeUser(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  const roleValue =
    rawUser.role ??
    rawUser.userRole ??
    rawUser.roles?.[0] ??
    rawUser.authorities?.[0]?.authority;

  const roleText = typeof roleValue === 'object'
    ? roleValue?.authority ?? roleValue?.name
    : roleValue;

  const role = String(roleText ?? '')
    .toLowerCase()
    .replace(/^role_/, '');

  if (!['user', 'admin', 'staff'].includes(role)) {
    return null;
  }

  const username =
    rawUser.username ??
    rawUser.displayName ??
    rawUser.fullName ??
    rawUser.name ??
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(getStoredUser()?.role)
  );
  const [modal, setModal] = useState(null);

  const openModal = useCallback((type) => {
    setModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const login = useCallback(async (email, password) => {
    let receivedToken = false;

    try {
      const response = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      const token = extractToken(response);

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        receivedToken = true;
      }

      let nextUser = normalizeUser(extractUser(response));

      // ถ้า Login ส่ง Token กลับมาอย่างเดียว ให้ขอข้อมูลผู้ใช้เพิ่ม
      if (!nextUser) {
        const profileResponse = await authService.getProfile();
        nextUser = normalizeUser(extractUser(profileResponse));
      }

      if (!nextUser) {
        throw new Error(
          'เข้าสู่ระบบแล้ว แต่ไม่พบ Role ของผู้ใช้จาก Backend'
        );
      }

      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem('isLoggedIn', 'true');

      setUser(nextUser);
      setIsLoggedIn(true);
      setModal(null);

      return { success: true, user: nextUser };
    } catch (error) {
      if (receivedToken) {
        localStorage.removeItem(TOKEN_KEY);
      }

      return {
        success: false,
        message: error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่',
      };
    }
  }, []);

  const register = useCallback(() => ({
    success: false,
    message: 'ระบบสมัครสมาชิกยังไม่ได้เชื่อมต่อ Backend',
  }), []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('mockUser');
    localStorage.setItem('isLoggedIn', 'false');

    setUser(null);
    setIsLoggedIn(false);
    setModal(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
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
