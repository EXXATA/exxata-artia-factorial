import apiClient from './client.js';

export const eventService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.project) params.append('project', filters.project);
    if (filters.day) params.append('day', filters.day);

    const response = await apiClient.get(`/events?${params.toString()}`);
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  async create(eventData) {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },

  async update(id, eventData) {
    const response = await apiClient.put(`/events/${id}`, eventData);
    return response.data;
  },

  async move(id, moveData) {
    const response = await apiClient.patch(`/events/${id}/move`, moveData);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data;
  },

  async importLegacy(file, mode = 'merge') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const response = await apiClient.post('/events/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  async analyzeImport(file, mapping = {}) {
    const formData = new FormData();
    formData.append('file', file);

    if (mapping && Object.keys(mapping).length > 0) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    const response = await apiClient.post('/events/import/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  async applyImport(rows = []) {
    const response = await apiClient.post('/events/import/apply', {
      rows
    });

    return response.data;
  }
};
