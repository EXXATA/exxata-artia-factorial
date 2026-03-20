export class AuthController {
  constructor(registerWithFactorialUseCase, loginUseCase, supabaseAuthService, userRepository) {
    this.registerWithFactorialUseCase = registerWithFactorialUseCase;
    this.loginUseCase = loginUseCase;
    this.supabaseAuthService = supabaseAuthService;
    this.userRepository = userRepository;
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await this.loginUseCase.execute(email, password);

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          session: result.session
        }
      });
    } catch (error) {
      if (error.message.includes('Credenciais inválidas')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (
        error.message.includes('Conta inativa no Factorial') ||
        error.message.includes('vínculo elegível no Factorial')
      ) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.code === 'FACTORIAL_AUTH_FAILED' || error.message.includes('Integração com Factorial indisponível')) {
        return res.status(503).json({
          success: false,
          message: 'Factorial integration unavailable. Check backend credentials.'
        });
      }

      return next(error);
    }
  }

  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await this.registerWithFactorialUseCase.execute(email, password);

      return res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          session: result.session
        }
      });
    } catch (error) {
      if (error.message.includes('já cadastrado')) {
        return res.status(409).json({
          success: false,
          message: 'User already exists'
        });
      }

      if (error.code === 'FACTORIAL_AUTH_FAILED' || error.message.includes('Integração com Factorial indisponível')) {
        return res.status(503).json({
          success: false,
          message: 'Factorial integration unavailable. Check backend credentials.'
        });
      }

      return next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const data = await this.supabaseAuthService.refreshSession(refreshToken);

      return res.status(200).json({
        success: true,
        data: {
          token: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          session: {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            expiresAt: data.session?.expires_at || null
          }
        }
      });
    } catch (_error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  async me(req, res, next) {
    try {
      const profile = await this.userRepository.findById(req.user.id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: profile.toJSON()
        }
      });
    } catch (error) {
      return next(error);
    }
  }
}
