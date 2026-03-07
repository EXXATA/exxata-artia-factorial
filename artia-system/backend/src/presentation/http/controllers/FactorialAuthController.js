export class FactorialAuthController {
  constructor(registerWithFactorialUseCase, loginUseCase) {
    this.registerWithFactorialUseCase = registerWithFactorialUseCase;
    this.loginUseCase = loginUseCase;
  }

  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      const result = await this.registerWithFactorialUseCase.execute(email, password);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message.includes('não encontrado no Factorial') || 
          error.message.includes('inativo') ||
          error.message.includes('já cadastrado')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
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

      const result = await this.loginUseCase.execute(email, password);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message.includes('Credenciais inválidas')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
}
