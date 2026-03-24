export class AuthError extends Error {
  constructor(message, { code = 'AUTH_ERROR', statusCode = 400, cause = null } = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }
  }
}

export function createAuthError(message, options = {}) {
  return new AuthError(message, options);
}

export function createInvalidSessionError(message = 'Sessao invalida ou expirada.', cause = null) {
  return createAuthError(message, {
    code: 'AUTH_INVALID_SESSION',
    statusCode: 401,
    cause
  });
}

export function createAuthInfrastructureError(
  message = 'Servico de autenticacao indisponivel no momento.',
  code = 'AUTH_INFRASTRUCTURE_UNAVAILABLE',
  cause = null
) {
  return createAuthError(message, {
    code,
    statusCode: 503,
    cause
  });
}

export function isAuthInfrastructureError(error) {
  return [
    'AUTH_PROVIDER_UNAVAILABLE',
    'AUTH_PROFILE_STORE_UNAVAILABLE',
    'SUPABASE_SERVICE_ROLE_KEY_MISSING',
    'BACKEND_CONFIG_MISSING'
  ].includes(error?.code);
}
