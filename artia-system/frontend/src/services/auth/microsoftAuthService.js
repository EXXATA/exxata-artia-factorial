import { authService } from '../api/authService';
import { supabase } from '../supabase/supabaseClient';

const CALLBACK_PATH = '/auth/callback';

function getCallbackUrl() {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

function getProviderError() {
  const url = new URL(window.location.href);
  const providerError = url.searchParams.get('error_description') || url.searchParams.get('error');
  return providerError ? decodeURIComponent(providerError) : null;
}

function getHashSession() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}

function clearAuthRedirectState() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function toSessionPayload(session) {
  if (!session) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || null
  };
}

async function waitForSession(attempts = 12) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  return null;
}

export const microsoftAuthService = {
  async signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: getCallbackUrl(),
        scopes: 'email'
      }
    });

    if (error) {
      throw error;
    }
  },

  async completeSignIn() {
    const providerError = getProviderError();
    if (providerError) {
      throw new Error(providerError);
    }

    const currentSession = await waitForSession(4);
    if (currentSession) {
      clearAuthRedirectState();
      return toSessionPayload(currentSession);
    }

    const hashSession = getHashSession();
    if (hashSession) {
      const { error } = await supabase.auth.setSession(hashSession);

      if (error) {
        throw error;
      }
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      if (data?.session) {
        clearAuthRedirectState();
        return toSessionPayload(data.session);
      }
    }

    const session = await waitForSession(20);
    if (!session) {
      throw new Error('Nao foi possivel concluir o login Microsoft.');
    }

    clearAuthRedirectState();
    return toSessionPayload(session);
  },

  async restoreSession(options = {}) {
    return authService.restoreSession(options);
  },

  async logout() {
    await authService.logout();
  }
};
