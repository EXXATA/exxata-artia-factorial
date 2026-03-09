import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class LoginUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(email, password) {
    // 1. Validar entrada
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    // 2. Buscar usuário no Supabase por email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    if (!user.passwordHash) {
      throw new Error('Usuário sem senha definida. Use o primeiro acesso para criar sua senha.');
    }

    // 3. Validar senha com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    // 4. Gerar novo JWT do sistema
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
}
