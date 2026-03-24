import { createAuthInfrastructureError } from '../../../domain/errors/AuthError.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function resolveDisplayName(authUser, currentProfile) {
  const metadataName = String(
    authUser?.user_metadata?.name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.display_name ||
    currentProfile?.name ||
    ''
  ).trim();

  if (metadataName) {
    return metadataName;
  }

  const email = normalizeEmail(authUser?.email || currentProfile?.email);
  return email ? email.split('@')[0] : 'Usuario Exxata';
}

export class ResolveAuthenticatedUserUseCase {
  constructor(userRepository, corporateMicrosoftIdentityPolicy) {
    this.userRepository = userRepository;
    this.corporateMicrosoftIdentityPolicy = corporateMicrosoftIdentityPolicy;
  }

  async execute(authUser) {
    const { email } = this.corporateMicrosoftIdentityPolicy.assertEligible(authUser);
    let currentProfile;

    try {
      currentProfile = await this.userRepository.findById(authUser.id);
    } catch (error) {
      throw createAuthInfrastructureError(
        'Nao foi possivel consultar o perfil local autenticado.',
        'AUTH_PROFILE_STORE_UNAVAILABLE',
        error
      );
    }

    if (!currentProfile) {
      let existingProfile;

      try {
        existingProfile = await this.userRepository.findByEmail(email);
      } catch (error) {
        throw createAuthInfrastructureError(
          'Nao foi possivel consultar o perfil local autenticado.',
          'AUTH_PROFILE_STORE_UNAVAILABLE',
          error
        );
      }

      const resolveError = existingProfile
        ? new Error('Perfil local encontrado com outro identificador. Execute a reconciliacao antes do login.')
        : new Error('Usuario autenticado sem perfil local provisionado. Execute a reconciliacao antes do login.');

      resolveError.code = existingProfile
        ? 'USER_PROFILE_RECONCILIATION_REQUIRED'
        : 'USER_PROFILE_NOT_PROVISIONED';

      throw resolveError;
    }

    try {
      return await this.userRepository.ensureProfile({
        id: currentProfile.id,
        email,
        name: resolveDisplayName(authUser, currentProfile),
        factorialEmployeeId: currentProfile.factorialEmployeeId,
        artiaUserId: currentProfile.artiaUserId
      });
    } catch (error) {
      throw createAuthInfrastructureError(
        'Nao foi possivel atualizar o perfil autenticado.',
        'AUTH_PROFILE_STORE_UNAVAILABLE',
        error
      );
    }
  }
}
