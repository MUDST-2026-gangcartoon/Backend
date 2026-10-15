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

  logout: () => {
    return apiClient.post('/auth/logout');
  },
};