export class ArtiaAuthController {
  constructor(loginWithArtiaUseCase, artiaAuthService) {
    this.loginWithArtiaUseCase = loginWithArtiaUseCase;
    this.artiaAuthService = artiaAuthService;
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

      const result = await this.loginWithArtiaUseCase.execute(email, password);

      res.json({
        success: true,
        data: {
          token: result.token,
          artiaToken: result.artiaToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async validateArtiaToken(req, res, next) {
    try {
      const { artiaToken } = req.body;

      if (!artiaToken) {
        return res.status(400).json({
          success: false,
          message: 'Token Artia é obrigatório'
        });
      }

      const user = await this.artiaAuthService.validateToken(artiaToken);

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
      const userId = req.user.userId;
      const artiaToken = req.body.artiaToken || req.user.artiaToken;

      if (!artiaToken) {
        return res.status(400).json({
          success: false,
          message: 'Token Artia não encontrado'
        });
      }

      const projects = await this.artiaAuthService.getUserProjects(artiaToken);

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
}
