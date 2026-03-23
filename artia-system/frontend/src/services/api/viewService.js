import { apiClient } from './client';

function buildParams({ startDate, endDate, project, activity, refresh } = {}) {
  const params = {};

  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (project) params.project = project;
  if (activity) params.activity = activity;
  if (refresh) params.refresh = true;

  return params;
}

async function get(path, filters = {}, fallbackMessage) {
  try {
    const response = await apiClient.get(path, {
      params: buildParams(filters)
    });

    if (response.data.success) {
      return { success: true, data: response.data.data };
    }

    return { success: false, message: fallbackMessage };
  } catch (error) {
    const message = error.response?.data?.message || 'Erro ao conectar com o servidor';
    return { success: false, message };
  }
}

export const viewService = {
  getWeekView(filters = {}) {
    return get('/views/week', filters, 'Erro ao buscar visão detalhada');
  },

  getRangeSummary(filters = {}) {
    return get('/views/range-summary', filters, 'Erro ao buscar visão resumida');
  }
};
