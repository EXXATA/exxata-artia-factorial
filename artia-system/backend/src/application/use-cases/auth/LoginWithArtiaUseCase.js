import jwt from 'jsonwebtoken';

export class LoginWithArtiaUseCase {
  constructor(artiaAuthService, userRepository) {
    this.artiaAuthService = artiaAuthService;
    this.userRepository = userRepository;
  }

  async execute(email, password) {
    // 1. Autentica via Artia
    const artiaAuth = await this.artiaAuthService.login(email, password);

    // 2. Busca ou cria usuário local no Supabase
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      user = await this.userRepository.create({
        email: artiaAuth.user.email,
        name: artiaAuth.user.name,
        artiaUserId: artiaAuth.user.artiaUserId,
        artiaToken: artiaAuth.token
      });
    } else {
      // Atualiza token Artia do usuário
      await this.userRepository.updateArtiaToken(user.id, artiaAuth.token);
    }

    // 3. Gera JWT próprio do sistema (para autenticação nas rotas)
    const systemToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        artiaUserId: user.artiaUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token: systemToken,
      artiaToken: artiaAuth.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        artiaUserId: user.artiaUserId
      }
    };
  }
}
