import axios from 'axios';
import { clearAuthState, getStoredToken, persistAuthState } from '../auth/authStorage';
import { supabase } from '../supabase/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function resolveAccessToken() {
  const storedToken = getStoredToken();

  if (storedToken) {
    return storedToken;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

authApi.interceptors.request.use(
  async (config) => {
    const token = await resolveAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

async function applySession(authData) {
  const session = authData?.session;

  persistAuthState({
    session,
    user: authData?.user
  });

  if (session?.accessToken && session?.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    });

    if (error) {
      clearAuthState();
      throw error;
    }
  }

  return authData;
}

export const authService = {
  async login(email, password) {
    const response = await authApi.post('/auth/login', { email, password });
    return applySession(response.data.data);
  },

  async register(email, password) {
    const response = await authApi.post('/auth/register', { email, password });
    return applySession(response.data.data);
  },

  async refreshSession(refreshToken) {
    const response = await authApi.post('/auth/refresh', { refreshToken });
    return applySession(response.data.data);
  },

  async getCurrentUser() {
    const response = await authApi.get('/auth/me');
    const user = response.data?.data?.user || null;

    persistAuthState({
      session: {
        accessToken: getStoredToken()
      },
      user
    });

    return user;
  },

  async restoreSession() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      clearAuthState();
      return null;
    }

    persistAuthState({
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || null
      }
    });

    const user = await this.getCurrentUser();

    return {
      session,
      user
    };
  },

  async logout() {
    await supabase.auth.signOut();
    clearAuthState();
  }
};
