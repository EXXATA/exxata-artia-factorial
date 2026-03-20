import { getSupabaseClient, supabaseAdmin, supabaseAuth } from '../database/supabase/supabaseClient.js';

function normalizeAuthErrorMessage(error) {
  return error?.message || error?.code || 'Erro de autenticação no Supabase';
}

export class SupabaseAuthService {
  ensureAdminClient() {
    if (!supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada para operações administrativas de auth');
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

  async getUserFromAccessToken(accessToken) {
    const client = getSupabaseClient(accessToken);
    const { data, error } = await client.auth.getUser();

    if (error) {
      throw new Error(normalizeAuthErrorMessage(error));
    }

    return data.user;
  }
}
