export class RegisterWithFactorialUseCase {
  constructor(factorialService, userRepository, supabaseAuthService) {
    this.factorialService = factorialService;
    this.userRepository = userRepository;
    this.supabaseAuthService = supabaseAuthService;
  }

  buildAuthResult(user, session) {
    return {
      token: session.access_token,
      refreshToken: session.refresh_token,
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || null
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        factorialEmployeeId: user.factorialEmployeeId,
        artiaUserId: user.artiaUserId
      }
    };
  }

  async execute(email, password) {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    if (password.length < 8) {
      throw new Error('A senha deve ter no mínimo 8 caracteres');
    }

    const employee = await this.factorialService.getEmployeeByEmail(email);

    if (!employee) {
      throw new Error('Email não encontrado no Factorial. Apenas employees cadastrados podem se registrar.');
    }

    if (!employee.isActive) {
      throw new Error('Employee inativo no Factorial. Não é possível criar conta.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    const existingAuthUser = existingUser ? await this.supabaseAuthService.getUserById(existingUser.id) : null;

    if (existingAuthUser) {
      throw new Error('Usuário já cadastrado. Faça login.');
    }

    const authUser = await this.supabaseAuthService.createUser({
      id: existingUser?.id,
      email: employee.email,
      password,
      name: employee.fullName
    });

    const profile = await this.userRepository.ensureProfile({
      id: authUser.id,
      email: employee.email,
      name: employee.fullName,
      factorialEmployeeId: String(employee.id),
      artiaUserId: existingUser?.artiaUserId || null
    });

    const authData = await this.supabaseAuthService.signInWithPassword(employee.email, password);
    return this.buildAuthResult(profile, authData.session);
  }
}
