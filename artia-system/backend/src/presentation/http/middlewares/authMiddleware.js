import { ResolveAuthenticatedUserUseCase } from '../../../application/use-cases/auth/ResolveAuthenticatedUserUseCase.js';
import { config } from '../../../config/app.js';
import { isAuthInfrastructureError } from '../../../domain/errors/AuthError.js';
import { CorporateMicrosoftIdentityPolicy } from '../../../domain/services/CorporateMicrosoftIdentityPolicy.js';
import { SupabaseAuthService } from '../../../infrastructure/auth/SupabaseAuthService.js';
import { UserRepository } from '../../../infrastructure/database/supabase/UserRepository.js';
import { toAuthenticatedRequestUser } from '../presenters/AuthenticatedUserPresenter.js';
import { sendAuthErrorResponse } from './authErrorResponse.js';

const userRepository = new UserRepository();
const supabaseAuthService = new SupabaseAuthService();
const corporateMicrosoftIdentityPolicy = new CorporateMicrosoftIdentityPolicy({
  allowedDomain: config.microsoftAllowedDomain,
  allowedTenantId: config.microsoftTenantId
});
const resolveAuthenticatedUserUseCase = new ResolveAuthenticatedUserUseCase(
  userRepository,
  corporateMicrosoftIdentityPolicy
);

const forbiddenErrorCodes = new Set([
  'AUTH_FORBIDDEN_DOMAIN',
  'AUTH_FORBIDDEN_PROVIDER',
  'AUTH_FORBIDDEN_TENANT',
  'AUTH_PROVISIONING_PENDING',
  'USER_PROFILE_RECONCILIATION_REQUIRED'
]);
const unauthorizedErrorCodes = new Set(['AUTH_INVALID_SESSION']);

function extractBearerToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return null;
  }

  return parts[1];
}

export async function authMiddleware(req, res, next) {
  const accessToken = extractBearerToken(req.headers.authorization);

  if (!accessToken) {
    return sendAuthErrorResponse(res, 401, {
      message: 'Sessao invalida ou ausente.',
      code: 'AUTH_INVALID_SESSION'
    });
  }

  try {
    const authUser = await supabaseAuthService.getUserFromAccessToken(accessToken);
    const profile = await resolveAuthenticatedUserUseCase.execute(authUser);

    req.authProfile = profile;
    req.user = toAuthenticatedRequestUser(profile);
    req.auth = {
      type: 'supabase',
      accessToken
    };

    return next();
  } catch (error) {
    if (forbiddenErrorCodes.has(error.code)) {
      return sendAuthErrorResponse(res, 403, error);
    }

    if (unauthorizedErrorCodes.has(error.code)) {
      return sendAuthErrorResponse(res, 401, {
        message: error.message || 'Sessao invalida ou expirada.',
        code: error.code
      });
    }

    if (isAuthInfrastructureError(error)) {
      console.error('[authMiddleware] infrastructure error:', error);
      return sendAuthErrorResponse(res, error.statusCode || 503, {
        message: config.nodeEnv === 'production'
          ? 'Servico de autenticacao indisponivel no momento.'
          : error.message,
        code: error.code
      });
    }

    console.error('[authMiddleware] unexpected error:', error);
    return sendAuthErrorResponse(res, 500, {
      message: config.nodeEnv === 'production'
        ? 'Falha inesperada ao resolver autenticacao.'
        : (error.message || 'Falha inesperada ao resolver autenticacao.')
    });
  }
}
