import { artiaDB } from '../database/mysql/ArtiaDBConnection.js';
import bcrypt from 'bcryptjs';

export class ArtiaDBService {
  /**
   * Autentica usuário via banco MySQL do Artia
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<{user: object}>}
   */
  async login(email, password) {
    try {
      // Busca usuário no banco Artia
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
        throw new Error('Usuário não encontrado ou inativo no Artia');
      }

      const user = users[0];

      // Nota: O Artia não armazena senha no banco de dados exportado
      // A autenticação real deve ser feita via API REST do Artia
      // Este método é apenas para validar que o usuário existe
      // Para autenticação completa, use ArtiaAuthService (API REST)
      
      // Por enquanto, apenas validamos que o usuário existe e está ativo
      console.warn('⚠️  Autenticação via banco MySQL não valida senha. Use API REST para autenticação completa.');

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          artiaUserId: user.id.toString()
        }
      };
    } catch (error) {
      throw new Error('Erro ao autenticar no banco Artia: ' + error.message);
    }
  }

  /**
   * Valida se usuário existe e está ativo
   * @param {string} userId - ID do usuário no Artia
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
        throw new Error('Usuário não encontrado ou inativo');
      }

      const user = users[0];

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        artiaUserId: user.id.toString()
      };
    } catch (error) {
      throw new Error('Erro ao validar usuário: ' + error.message);
    }
  }

  /**
   * Busca todos os projetos do Artia
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
        WHERE status = 1 AND object_type = 'project'
          ${hasSearch ? 'AND (project_number LIKE ? OR name LIKE ?)' : ''}
        ORDER BY name`,
        hasSearch ? [`%${searchTerm}%`, `%${searchTerm}%`] : []
      );

      return projects.map(p => ({
        id: p.id,
        number: p.number,
        name: p.name,
        active: p.active,
        createdAt: p.created_at
      }));
    } catch (error) {
      throw new Error('Erro ao buscar projetos do Artia: ' + error.message);
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

      return activities.map(a => ({
        id: a.id,
        projectId: a.project_id,
        label: a.label,
        artiaId: a.id.toString(),
        active: a.active === 1
      }));
    } catch (error) {
      throw new Error('Erro ao buscar atividades do Artia: ' + error.message);
    }
  }

  /**
   * Busca atividades de um projeto específico
   * @param {string} projectId - ID do projeto
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

      return activities.map(a => ({
        id: a.id,
        projectId: a.project_id,
        label: a.label,
        artiaId: a.id.toString(),
        active: a.active === 1
      }));
    } catch (error) {
      throw new Error('Erro ao buscar atividades do Artia: ' + error.message);
    }
  }

  /**
   * Busca projeto específico por ID
   * @param {string} projectId - ID do projeto
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
        WHERE id = ? AND object_type = 'project'`,
        [projectId]
      );

      if (projects.length === 0) {
        throw new Error('Projeto não encontrado');
      }

      const project = projects[0];

      return {
        id: project.id,
        number: project.number,
        name: project.name,
        active: project.active,
        createdAt: project.created_at
      };
    } catch (error) {
      throw new Error('Erro ao buscar projeto: ' + error.message);
    }
  }

  /**
   * Busca projetos e atividades completos
   * @returns {Promise<Array>}
   */
  async getProjectsWithActivities() {
    try {
      const searchTerm = arguments[0] ? String(arguments[0]).trim() : '';
      const projects = await this.getUserProjects(searchTerm);
      const activities = await this.getProjectActivitiesByProjectIds(projects.map((project) => project.id));
      const activitiesByProject = activities.reduce((acc, activity) => {
        if (!acc[activity.projectId]) {
          acc[activity.projectId] = [];
        }

        acc[activity.projectId].push(activity);
        return acc;
      }, {});

      const projectsWithActivities = projects.map((project) => ({
        ...project,
        activities: activitiesByProject[project.id] || []
      }));

      return projectsWithActivities;
    } catch (error) {
      throw new Error('Erro ao buscar projetos com atividades: ' + error.message);
    }
  }
}
