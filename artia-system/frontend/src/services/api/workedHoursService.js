import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

function buildWorkedHoursParams({ startDate, endDate, date, year, month, project, activity, refresh } = {}) {
  const params = {};

  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (date) params.date = date;
  if (year) params.year = year;
  if (month) params.month = month;
  if (project) params.project = project;
  if (activity) params.activity = activity;
  if (refresh) params.refresh = true;

  return params;
}

export const workedHoursService = {
  async getFullHistory(filters = {}) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/history`, {
        headers: getAuthHeaders(),
        params: buildWorkedHoursParams(filters)
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

  async getRangeComparison({ startDate, endDate, project, activity, refresh = false }) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/range`, {
        headers: getAuthHeaders(),
        params: buildWorkedHoursParams({ startDate, endDate, project, activity, refresh })
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }

      return { success: false, message: 'Erro ao buscar comparação por intervalo' };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
      return { success: false, message };
    }
  },

  async getDailyComparison({ date, project, activity, refresh = false }) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/daily`, {
        headers: getAuthHeaders(),
        params: buildWorkedHoursParams({ date, project, activity, refresh })
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

  async getMonthlyComparison({ year, month, project, activity, refresh = false }) {
    try {
      const response = await axios.get(`${API_URL}/api/v1/worked-hours/monthly`, {
        headers: getAuthHeaders(),
        params: buildWorkedHoursParams({ year, month, project, activity, refresh })
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
