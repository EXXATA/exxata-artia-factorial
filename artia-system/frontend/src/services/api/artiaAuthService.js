import { apiClient } from './client';

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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('artia_token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  getArtiaToken() {
    return localStorage.getItem('artia_token');
  }
};
