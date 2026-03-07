import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const factorialAuthService = {
  async register(email, password) {
    try {
      const response = await axios.post(`${API_URL}/api/v1/factorial-auth/register`, {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Armazenar token e dados do usuário
        localStorage.setItem('token', token);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Erro ao registrar' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/api/v1/factorial-auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Armazenar token e dados do usuário
        localStorage.setItem('token', token);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Credenciais inválidas' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getToken() {
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
