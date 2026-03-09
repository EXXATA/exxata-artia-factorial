import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class RegisterWithFactorialUseCase {
  constructor(factorialService, userRepository) {
    this.factorialService = factorialService;
    this.userRepository = userRepository;
  }

  buildAuthResult(user) {
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        factorialEmployeeId: user.factorialEmployeeId,
        artiaUserId: user.artiaUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token,
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
    // 1. Validar entrada
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    if (password.length < 8) {
      throw new Error('A senha deve ter no mínimo 8 caracteres');
    }

    // 2. Buscar employee no Factorial por email
    const employee = await this.factorialService.getEmployeeByEmail(email);

    if (!employee) {
      throw new Error('Email não encontrado no Factorial. Apenas employees cadastrados podem se registrar.');
    }

    if (!employee.isActive) {
      throw new Error('Employee inativo no Factorial. Não é possível criar conta.');
    }

    // 3. Verificar se usuário já existe no sistema
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      if (existingUser.passwordHash) {
        throw new Error('Usuário já cadastrado. Faça login.');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const claimedUser = await this.userRepository.updateIdentity(existingUser.id, {
        name: employee.fullName,
        factorialEmployeeId: employee.id.toString()
      });

      const completedUser = await this.userRepository.updatePassword(existingUser.id, passwordHash);
      return this.buildAuthResult({
        ...claimedUser,
        ...completedUser,
        passwordHash
      });
    }

    // 4. Criar hash bcrypt da senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Criar usuário no Supabase
    const user = await this.userRepository.create({
      email: employee.email,
      name: employee.fullName,
      passwordHash,
      factorialEmployeeId: employee.id.toString()
    });

    return this.buildAuthResult(user);
  }
}
