import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const workedHoursService = {
  async getFullHistory() {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/history`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Erro ao buscar histórico' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async getDailyComparison(date) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/daily`, {
        headers: getAuthHeaders(),
        params: { date }
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Erro ao buscar comparação diária' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async getMonthlyComparison(year, month) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/monthly`, {
        headers: getAuthHeaders(),
        params: { year, month }
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Erro ao buscar comparação mensal' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  }
};
