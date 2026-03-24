import { apiClient } from './client';
import { clearAuthState, getStoredUser, persistAuthState } from '../auth/authStorage';
import { supabase } from '../supabase/supabaseClient';

let currentUserRequest = null;
let currentUserRequestToken = null;
let hydratedAccessToken = null;

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

async function getCurrentSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session || null;
}

function resetCurrentUserState() {
  currentUserRequest = null;
  currentUserRequestToken = null;
  hydratedAccessToken = null;
}

export const authService = {
  async getCurrentUser({ force = false } = {}) {
    const session = await getCurrentSession();

    if (!session) {
      resetCurrentUserState();
      clearAuthState();
      return null;
    }

    const accessToken = session.access_token;
    const storedUser = getStoredUser();

    if (!force && hydratedAccessToken === accessToken && storedUser) {
      return storedUser;
    }

    if (!force && currentUserRequest && currentUserRequestToken === accessToken) {
      return currentUserRequest;
    }

    currentUserRequestToken = accessToken;
    currentUserRequest = apiClient.get('/auth/me')
      .then((response) => {
        const user = response.data?.data?.user || null;
        persistAuthState({ user });
        hydratedAccessToken = accessToken;
        return user;
      })
      .finally(() => {
        if (currentUserRequestToken === accessToken) {
          currentUserRequest = null;
          currentUserRequestToken = null;
        }
      });

    return currentUserRequest;
  },

  async restoreSession({ forceUserSync = false } = {}) {
    const session = await getCurrentSession();

    if (!session) {
      resetCurrentUserState();
      clearAuthState();
      return null;
    }

    const user = await this.getCurrentUser({ force: forceUserSync });

    return {
      session: toSessionPayload(session),
      user
    };
  },

  resetCurrentUserCache() {
    resetCurrentUserState();
  },

  async logout() {
    await supabase.auth.signOut();
    resetCurrentUserState();
    clearAuthState();
  }
};
