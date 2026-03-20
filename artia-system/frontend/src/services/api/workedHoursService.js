import { apiClient } from './client';

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
      const response = await apiClient.get('/worked-hours/history', {
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
      const response = await apiClient.get('/worked-hours/range', {
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
      const response = await apiClient.get('/worked-hours/daily', {
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
      const response = await apiClient.get('/worked-hours/monthly', {
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
