import apiClient from './client';

export const projectService = {
  async getAll() {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  async search(query) {
    const response = await apiClient.get(`/projects/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  async getActivities(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/activities`);
    return response.data;
  },

  async importProjects(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/projects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};
