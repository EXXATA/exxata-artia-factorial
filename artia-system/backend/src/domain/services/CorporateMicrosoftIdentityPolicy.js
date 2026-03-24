import { Email } from '../value-objects/Email.js';

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function collectProviders(authUser) {
  const providers = new Set();

  const primaryProvider = normalizeValue(authUser?.app_metadata?.provider);
  if (primaryProvider) {
    providers.add(primaryProvider);
  }

  for (const provider of authUser?.app_metadata?.providers || []) {
    const normalizedProvider = normalizeValue(provider);
    if (normalizedProvider) {
      providers.add(normalizedProvider);
    }
  }

  for (const identity of authUser?.identities || []) {
    const normalizedProvider = normalizeValue(identity?.provider);
    if (normalizedProvider) {
      providers.add(normalizedProvider);
    }
  }

  return [...providers];
}

function collectTenantIds(authUser) {
  const tenantIds = new Set();
  const sources = [
    authUser?.user_metadata,
    authUser?.app_metadata,
    ...(authUser?.identities || []).map((identity) => identity?.identity_data)
  ];

  for (const source of sources) {
    for (const key of ['tid', 'tenant_id', 'tenantId']) {
      const tenantId = normalizeValue(source?.[key]);
      if (tenantId) {
        tenantIds.add(tenantId);
      }
    }
  }

  return [...tenantIds];
}

export class CorporateMicrosoftIdentityPolicy {
  constructor({ allowedDomain = 'exxata.com.br', allowedProvider = 'azure', allowedTenantId = null } = {}) {
    this.allowedDomain = normalizeValue(allowedDomain);
    this.allowedProvider = normalizeValue(allowedProvider);
    this.allowedTenantId = normalizeValue(allowedTenantId) || null;
  }

  assertEligible(authUser) {
    const email = new Email(authUser?.email || '');
    const normalizedEmail = normalizeValue(email.toString());

    if (!normalizedEmail.endsWith(`@${this.allowedDomain}`)) {
      const error = new Error(`Acesso restrito a contas corporativas @${this.allowedDomain}.`);
      error.code = 'AUTH_FORBIDDEN_DOMAIN';
      throw error;
    }

    const providers = collectProviders(authUser);
    if (!providers.includes(this.allowedProvider)) {
      const error = new Error('Acesso permitido somente por login Microsoft corporativo.');
      error.code = 'AUTH_FORBIDDEN_PROVIDER';
      throw error;
    }

    const tenantIds = collectTenantIds(authUser);
    if (this.allowedTenantId && tenantIds.length > 0 && !tenantIds.includes(this.allowedTenantId)) {
      const error = new Error('Conta Microsoft sem vínculo com o tenant corporativo permitido.');
      error.code = 'AUTH_FORBIDDEN_TENANT';
      throw error;
    }

    return {
      email: normalizedEmail,
      providers,
      tenantIds
    };
  }
}
