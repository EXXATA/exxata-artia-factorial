import axios from 'axios';

const ARTIA_API_BASE = 'https://api.artia.com';

class ArtiaClient {
  constructor() {
    this.token = localStorage.getItem('artia_token');
    this.client = axios.create({
      baseURL: ARTIA_API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('artia_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('artia_token');
  }

  // Buscar todos os projetos
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      throw error;
    }
  }

  // Buscar atividades de um projeto
  async getProjectActivities(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/activities`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      throw error;
    }
  }

  // Buscar projeto específico
  async getProject(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      throw error;
    }
  }

  // Buscar atividade específica
  async getActivity(activityId) {
    try {
      const response = await this.client.get(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar atividade:', error);
      throw error;
    }
  }

  // Buscar projetos com filtro
  async searchProjects(query) {
    try {
      const response = await this.client.get('/projects/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      throw error;
    }
  }
}

export const artiaClient = new ArtiaClient();
