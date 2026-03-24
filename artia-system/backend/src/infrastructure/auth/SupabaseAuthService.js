import {
  assertServiceRoleConfigured,
  getSupabaseClient,
  supabaseAdmin,
  supabaseAuth
} from '../database/supabase/supabaseClient.js';
import {
  createAuthInfrastructureError,
  createInvalidSessionError
} from '../../domain/errors/AuthError.js';

function normalizeAuthErrorMessage(error) {
  return error?.message || error?.code || 'Erro de autenticacao no Supabase';
}

function isInvalidSessionError(error) {
  const haystack = String(
    error?.message || error?.code || error?.name || ''
  ).toLowerCase();

  return error?.status === 401 || [
    'invalid',
    'jwt',
    'session',
    'token'
  ].some((fragment) => haystack.includes(fragment));
}

function isConnectivityError(error) {
  const haystack = String(
    error?.message || error?.details || error?.cause?.message || ''
  ).toLowerCase();

  return [
    'fetch failed',
    'econnrefused',
    'enotfound',
    'eacces',
    'network'
  ].some((fragment) => haystack.includes(fragment));
}

export class SupabaseAuthService {
  ensureAdminClient() {
    if (!supabaseAdmin) {
      assertServiceRoleConfigured('administrative Supabase auth operations');
    }

    return supabaseAdmin;
  }

  async signInWithPassword(email, password) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }

    return data;
  }

  async refreshSession(refreshToken) {
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }

    return data;
  }

  async createUser({ id, email, password, passwordHash, name }) {
    const admin = this.ensureAdminClient();
    const payload = {
      email,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name
      }
    };

    if (id) {
      payload.id = id;
    }

    if (passwordHash) {
      payload.password_hash = passwordHash;
    } else {
      payload.password = password;
    }

    const { data, error } = await admin.auth.admin.createUser(payload);

    if (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }

    return data.user;
  }

  async getUserById(userId) {
    const admin = this.ensureAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);

    if (error) {
      if (error.status === 404) {
        return null;
      }

      throw new Error(normalizeAuthErrorMessage(error));
    }

    return data.user;
  }

  async listUsersPage({ page = 1, perPage = 1000 } = {}) {
    const admin = this.ensureAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }

    return {
      users: data?.users || [],
      nextPage: data?.nextPage || null
    };
  }

  async listAllUsers() {
    const users = [];
    let page = 1;

    while (true) {
      const { users: pageUsers, nextPage } = await this.listUsersPage({ page });
      users.push(...pageUsers);

      if (!nextPage) {
        break;
      }

      page = nextPage;
    }

    return users;
  }

  async getUserFromAccessToken(accessToken) {
    try {
      const client = getSupabaseClient(accessToken);
      const { data, error } = await client.auth.getUser();

      if (error) {
        if (isInvalidSessionError(error)) {
          throw createInvalidSessionError('Sessao invalida ou expirada.', error);
        }

        throw createAuthInfrastructureError(
          'Nao foi possivel validar a sessao Supabase no momento.',
          'AUTH_PROVIDER_UNAVAILABLE',
          error
        );
      }

      if (!data?.user) {
        throw createInvalidSessionError();
      }

      return data.user;
    } catch (error) {
      if (error?.code) {
        throw error;
      }

      if (isConnectivityError(error)) {
        throw createAuthInfrastructureError(
          'Nao foi possivel validar a sessao Supabase no momento.',
          'AUTH_PROVIDER_UNAVAILABLE',
          error
        );
      }

      throw createInvalidSessionError('Sessao invalida ou expirada.', error);
    }
  }
}
