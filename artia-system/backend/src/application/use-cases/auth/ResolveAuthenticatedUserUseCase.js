import {
  createAuthInfrastructureError,
  createProvisioningPendingError,
  createReconciliationRequiredError
} from '../../../domain/errors/AuthError.js';

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

      if (existingProfile) {
        throw createReconciliationRequiredError(
          'Perfil local encontrado com outro identificador. Execute a reconciliacao antes do login.',
          {
            canRetry: false,
            authUserId: authUser.id,
            profileId: existingProfile.id
          }
        );
      }

      throw createProvisioningPendingError(
        'Acesso pendente de provisionamento.',
        {
          missing: ['profile', 'factorial_employee_id'],
          canRetry: true
        }
      );
    }

    let syncedProfile;

    try {
      syncedProfile = await this.userRepository.ensureProfile({
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

    if (!syncedProfile.factorialEmployeeId) {
      throw createProvisioningPendingError(
        'Acesso pendente de provisionamento.',
        {
          missing: ['factorial_employee_id'],
          canRetry: true
        }
      );
    }

    return syncedProfile;
  }
}
