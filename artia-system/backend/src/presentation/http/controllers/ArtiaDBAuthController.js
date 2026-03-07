export class ArtiaDBAuthController {
  constructor(loginWithArtiaDBUseCase, artiaDBService) {
    this.loginWithArtiaDBUseCase = loginWithArtiaDBUseCase;
    this.artiaDBService = artiaDBService;
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      const result = await this.loginWithArtiaDBUseCase.execute(email, password);

      res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async validateUser(req, res, next) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
      }

      const user = await this.artiaDBService.validateUser(userId);

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  async syncProjects(req, res, next) {
    try {
      const projects = await this.artiaDBService.getProjectsWithActivities();

      res.json({
        success: true,
        data: {
          projects,
          count: projects.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req, res, next) {
    try {
      const projects = await this.artiaDBService.getUserProjects();

      res.json({
        success: true,
        data: {
          projects,
          count: projects.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectActivities(req, res, next) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'ID do projeto é obrigatório'
        });
      }

      const activities = await this.artiaDBService.getProjectActivities(projectId);

      res.json({
        success: true,
        data: {
          activities,
          count: activities.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
