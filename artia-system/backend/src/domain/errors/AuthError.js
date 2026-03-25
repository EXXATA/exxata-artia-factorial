export class AuthError extends Error {
  constructor(message, { code = 'AUTH_ERROR', statusCode = 400, cause = null, data = undefined } = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;

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

export function createProvisioningPendingError(
  message = 'Acesso pendente de provisionamento.',
  data = { missing: ['factorial_employee_id'], canRetry: true }
) {
  return createAuthError(message, {
    code: 'AUTH_PROVISIONING_PENDING',
    statusCode: 403,
    data
  });
}

export function createReconciliationRequiredError(
  message = 'Perfil local encontrado com outro identificador. Execute a reconciliacao antes do login.',
  data = { canRetry: false }
) {
  return createAuthError(message, {
    code: 'USER_PROFILE_RECONCILIATION_REQUIRED',
    statusCode: 403,
    data
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
