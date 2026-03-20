import { apiClient } from './client';
import { clearArtiaToken, getArtiaToken } from '../auth/authStorage';

export const artiaAuthService = {
  async login(email, password) {
    const response = await apiClient.post('/artia-auth/login', {
      email,
      password
    });

    return response.data;
  },

  async validateToken(artiaToken) {
    const response = await apiClient.post('/artia-auth/validate', {
      artiaToken
    });

    return response.data;
  },

  async syncProjects(artiaToken) {
    const response = await apiClient.post('/artia-auth/sync-projects', {
      artiaToken
    });

    return response.data;
  },

  logout() {
    clearArtiaToken();
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!getArtiaToken();
  },

  getArtiaToken() {
    return getArtiaToken();
  }
};
