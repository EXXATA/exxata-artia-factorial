import { clearAuthState, getStoredToken, getStoredUser } from '../auth/authStorage';
import { authService } from './authService';

export const factorialAuthService = {
  async register(email, password) {
    try {
      const data = await authService.register(email, password);
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async login(email, password) {
    try {
      const data = await authService.login(email, password);
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async restoreSession() {
    try {
      const data = await authService.restoreSession();
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Sessão inválida';
      return { success: false, message };
    }
  },

  async logout() {
    try {
      await authService.logout();
    } finally {
      clearAuthState();
    }
  },

  getToken() {
    return getStoredToken();
  },

  getUser() {
    return getStoredUser();
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
