import axios from 'axios';

export class ArtiaAuthService {
  constructor() {
    this.apiBase = process.env.ARTIA_API_URL || 'https://api.artia.com';
  }

  /**
   * Autentica usuário via API Artia
   * @param {string} email - Email do usuário no Artia
   * @param {string} password - Senha do usuário no Artia
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${this.apiBase}/auth/login`, {
        email,
        password
      });

      return {
        token: response.data.token,
        user: {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          artiaUserId: response.data.user.id
        }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Credenciais inválidas do Artia');
      }
      throw new Error('Erro ao autenticar com Artia: ' + error.message);
    }
  }

  /**
   * Valida token Artia
   * @param {string} token - Token de acesso Artia
   * @returns {Promise<object>} Dados do usuário
   */
  async validateToken(token) {
    try {
      const response = await axios.get(`${this.apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        artiaUserId: response.data.id
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Token Artia inválido ou expirado');
      }
      throw new Error('Erro ao validar token Artia: ' + error.message);
    }
  }

  /**
   * Busca projetos do usuário autenticado
   * @param {string} token - Token de acesso Artia
   * @returns {Promise<Array>}
   */
  async getUserProjects(token) {
    try {
      const response = await axios.get(`${this.apiBase}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error('Erro ao buscar projetos do Artia: ' + error.message);
    }
  }

  /**
   * Busca atividades de um projeto
   * @param {string} token - Token de acesso Artia
   * @param {string} projectId - ID do projeto
   * @returns {Promise<Array>}
   */
  async getProjectActivities(token, projectId) {
    try {
      const response = await axios.get(`${this.apiBase}/projects/${projectId}/activities`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      throw new Error('Erro ao buscar atividades do Artia: ' + error.message);
    }
  }
}
