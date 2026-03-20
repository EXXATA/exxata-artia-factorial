import bcrypt from 'bcrypt';

export class LoginUseCase {
  constructor(userRepository, supabaseAuthService, factorialService) {
    this.userRepository = userRepository;
    this.supabaseAuthService = supabaseAuthService;
    this.factorialService = factorialService;
  }

  async execute(email, password) {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    let authData;

    try {
      authData = await this.supabaseAuthService.signInWithPassword(email, password);
    } catch (error) {
      authData = await this.tryLegacyMigration(email, password);
    }

    const authUser = authData?.user;
    const session = authData?.session;

    if (!authUser || !session?.access_token) {
      throw new Error('Credenciais inválidas');
    }

    const currentProfile = await this.userRepository.findById(authUser.id);
    const employee = await this.resolveEligibleEmployee(authUser, currentProfile);

    const profile = await this.userRepository.ensureProfile({
      id: authUser.id,
      email: authUser.email,
      name: currentProfile?.name || employee.fullName || authUser.user_metadata?.name || authUser.email,
      factorialEmployeeId: String(employee.id),
      artiaUserId: currentProfile?.artiaUserId || null
    });

    return {
      token: session.access_token,
      refreshToken: session.refresh_token,
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || null
      },
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        factorialEmployeeId: profile.factorialEmployeeId,
        artiaUserId: profile.artiaUserId
      }
    };
  }

  async tryLegacyMigration(email, password) {
    const legacyUser = await this.userRepository.findByEmail(email);

    if (!legacyUser?.passwordHash) {
      throw new Error('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, legacyUser.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    const employee = await this.resolveEligibleEmployee(
      { email: legacyUser.email, user_metadata: { name: legacyUser.name } },
      legacyUser
    );

    try {
      await this.supabaseAuthService.createUser({
        id: legacyUser.id,
        email: legacyUser.email,
        passwordHash: legacyUser.passwordHash,
        name: legacyUser.name || employee.fullName
      });
    } catch (error) {
      const message = error.message || '';
      if (!message.includes('already') && !message.includes('registered')) {
        throw error;
      }
    }

    await this.userRepository.ensureProfile({
      id: legacyUser.id,
      email: legacyUser.email,
      name: legacyUser.name || employee.fullName,
      factorialEmployeeId: String(employee.id),
      artiaUserId: legacyUser.artiaUserId || null
    });

    return this.supabaseAuthService.signInWithPassword(email, password);
  }

  async resolveEligibleEmployee(authUser, user) {
    let employee = null;

    if (user?.factorialEmployeeId) {
      try {
        employee = await this.factorialService.getEmployeeById(user.factorialEmployeeId);
      } catch (error) {
        employee = null;
      }
    }

    if (!employee && authUser?.email) {
      employee = await this.factorialService.getEmployeeByEmail(authUser.email);
    }

    if (!employee) {
      throw new Error('Usuário sem vínculo elegível no Factorial.');
    }

    if (!employee.isActive) {
      throw new Error('Conta inativa no Factorial. Acesso bloqueado.');
    }

    return employee;
  }
}
