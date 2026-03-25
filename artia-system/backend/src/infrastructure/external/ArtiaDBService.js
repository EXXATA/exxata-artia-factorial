import { artiaDB } from '../database/mysql/ArtiaDBConnection.js';

function normalizeProjectNumber(number, id) {
  const normalized = String(number || '').trim();
  return normalized || `SEM-NUMERO-${id}`;
}

export class ArtiaDBService {
  /**
   * Localiza um usuario ativo no banco legado do Artia.
   * Este metodo nao participa do fluxo oficial de login.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object}>}
   */
  async login(email, password) {
    try {
      void password;

      const users = await artiaDB.query(
        `SELECT
          id,
          user_email as email,
          user_name as name,
          status as active
        FROM organization_9115_organization_users_v2
        WHERE user_email = ? AND status = 1`,
        [email]
      );

      if (users.length === 0) {
        throw new Error('Usuario nao encontrado ou inativo no Artia');
      }

      const user = users[0];

      // O banco exportado do Artia nao contem credenciais reutilizaveis.
      // O fluxo oficial de autenticacao do sistema e Microsoft + Supabase.
      console.warn('Autenticacao via banco MySQL nao valida senha e nao faz parte do fluxo oficial de login.');

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          artiaUserId: user.id.toString()
        }
      };
    } catch (error) {
      throw new Error(`Erro ao autenticar no banco Artia: ${error.message}`);
    }
  }

  /**
   * Valida se usuario existe e esta ativo.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async validateUser(userId) {
    try {
      const users = await artiaDB.query(
        `SELECT
          id,
          user_email as email,
          user_name as name,
          status as active
        FROM organization_9115_organization_users_v2
        WHERE id = ? AND status = 1`,
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario nao encontrado ou inativo');
      }

      const user = users[0];

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        artiaUserId: user.id.toString()
      };
    } catch (error) {
      throw new Error(`Erro ao validar usuario: ${error.message}`);
    }
  }

  /**
   * Busca todos os projetos do Artia.
   * @returns {Promise<Array>}
   */
  async getUserProjects() {
    try {
      const searchTerm = arguments[0] ? String(arguments[0]).trim() : '';
      const hasSearch = Boolean(searchTerm);
      const projects = await artiaDB.query(
        `SELECT
          id,
          name,
          project_number as number,
          status as active,
          created_at
        FROM organization_9115_projects_v2
        WHERE LOWER(object_type) = 'project'
          ${hasSearch ? 'AND (project_number LIKE ? OR name LIKE ?)' : ''}
        ORDER BY name`,
        hasSearch ? [`%${searchTerm}%`, `%${searchTerm}%`] : []
      );

      return projects.map((project) => ({
        id: project.id,
        number: normalizeProjectNumber(project.number, project.id),
        name: project.name,
        active: project.active,
        createdAt: project.created_at
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar projetos do Artia: ${error.message}`);
    }
  }

  async getProjectActivitiesByProjectIds(projectIds) {
    try {
      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return [];
      }

      const placeholders = projectIds.map(() => '?').join(', ');
      const activities = await artiaDB.query(
        `SELECT
          id,
          parent_id as project_id,
          title as label,
          activity_status as active
        FROM organization_9115_activities_v2
        WHERE parent_id IN (${placeholders}) AND status = 1
        ORDER BY parent_id, title`,
        projectIds
      );

      return activities.map((activity) => ({
        id: activity.id,
        projectId: activity.project_id,
        label: activity.label,
        artiaId: activity.id.toString(),
        active: activity.active === 1
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar atividades do Artia: ${error.message}`);
    }
  }

  /**
   * Busca atividades de um projeto especifico.
   * @param {string} projectId
   * @returns {Promise<Array>}
   */
  async getProjectActivities(projectId) {
    try {
      const activities = await artiaDB.query(
        `SELECT
          id,
          parent_id as project_id,
          title as label,
          activity_status as active
        FROM organization_9115_activities_v2
        WHERE parent_id = ? AND status = 1
        ORDER BY title`,
        [projectId]
      );

      return activities.map((activity) => ({
        id: activity.id,
        projectId: activity.project_id,
        label: activity.label,
        artiaId: activity.id.toString(),
        active: activity.active === 1
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar atividades do Artia: ${error.message}`);
    }
  }

  /**
   * Busca projeto especifico por ID.
   * @param {string} projectId
   * @returns {Promise<object>}
   */
  async getProject(projectId) {
    try {
      const projects = await artiaDB.query(
        `SELECT
          id,
          name,
          project_number as number,
          status as active,
          created_at
        FROM organization_9115_projects_v2
        WHERE id = ? AND LOWER(object_type) = 'project'`,
        [projectId]
      );

      if (projects.length === 0) {
        throw new Error('Projeto nao encontrado');
      }

      const project = projects[0];

      return {
        id: project.id,
        number: normalizeProjectNumber(project.number, project.id),
        name: project.name,
        active: project.active,
        createdAt: project.created_at
      };
    } catch (error) {
      throw new Error(`Erro ao buscar projeto: ${error.message}`);
    }
  }

  /**
   * Busca projetos e atividades completos.
   * @returns {Promise<Array>}
   */
  async getProjectsWithActivities() {
    try {
      const searchTerm = arguments[0] ? String(arguments[0]).trim() : '';
      const projects = await this.getUserProjects(searchTerm);
      const activities = await this.getProjectActivitiesByProjectIds(
        projects.map((project) => project.id)
      );

      const activitiesByProject = activities.reduce((acc, activity) => {
        if (!acc[activity.projectId]) {
          acc[activity.projectId] = [];
        }

        acc[activity.projectId].push(activity);
        return acc;
      }, {});

      return projects.map((project) => ({
        ...project,
        activities: activitiesByProject[project.id] || []
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar projetos com atividades: ${error.message}`);
    }
  }
}
