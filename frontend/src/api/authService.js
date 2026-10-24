import apiClient from './apiClient.js';

export const authService = {
  login: (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },

  signup: (userData) => {
    return apiClient.post('/auth/signup', userData);
  },

  getProfile: () => {
    return apiClient.get('/auth/me');
  },

  // แก้ชื่อ/อีเมล ต้องยืนยันด้วยรหัสผ่านปัจจุบัน
  // body: { name, email, currentPassword } -> คืนข้อมูลผู้ใช้ล่าสุด
  updateProfile: (payload) => {
    return apiClient.put('/auth/profile', payload);
  },

  // เปลี่ยนรหัสผ่าน body: { currentPassword, newPassword, confirmPassword }
  changePassword: (payload) => {
    return apiClient.put('/auth/password', payload);
  },

  // อัปโหลดรูปโปรไฟล์ (FormData field: file) -> คืนข้อมูลผู้ใช้หรือ { avatarUrl }
  uploadAvatar: (formData) => {
    return apiClient.postForm('/auth/profile/avatar', formData);
  },

  removeAvatar: () => {
    return apiClient.delete('/auth/profile/avatar');
  },

  logout: () => {
    return apiClient.post('/auth/logout');
  },
};