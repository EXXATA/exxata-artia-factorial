import { apiClient } from './client.js';

function buildParams({ startDate, endDate, projectKey, activityKey, refresh } = {}) {
  const params = {};

  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (projectKey) params.projectKey = projectKey;
  if (activityKey) params.activityKey = activityKey;
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
