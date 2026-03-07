import jwt from 'jsonwebtoken';

export class LoginWithArtiaDBUseCase {
  constructor(artiaDBService, userRepository) {
    this.artiaDBService = artiaDBService;
    this.userRepository = userRepository;
  }

  async execute(email, password) {
    // 1. Autentica via banco MySQL do Artia
    const artiaAuth = await this.artiaDBService.login(email, password);

    // 2. Busca ou cria usuário local no Supabase
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      user = await this.userRepository.create({
        email: artiaAuth.user.email,
        name: artiaAuth.user.name,
        artiaUserId: artiaAuth.user.artiaUserId,
        artiaToken: null // Não há token, conexão é direta ao banco
      });
    } else {
      // Atualiza informações do usuário se necessário
      if (user.name !== artiaAuth.user.name) {
        await this.userRepository.update(user.id, {
          name: artiaAuth.user.name
        });
      }
    }

    // 3. Gera JWT próprio do sistema
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        artiaUserId: user.artiaUserId
      }
    };
  }
}
