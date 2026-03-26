import axios from 'axios';
import { clearAuthState } from '../auth/authStorage.js';
import { supabase } from '../supabase/supabaseClient.js';
import { normalizeApiError } from './apiError.js';

function resolveApiBaseUrl() {
  const viteEnv = import.meta.env || {};
  const configuredApiUrl = viteEnv.VITE_API_URL || '/api/v1';
  const proxyTarget = viteEnv.VITE_API_PROXY_TARGET;
  const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (viteEnv.DEV && isLocalHost && proxyTarget && configuredApiUrl.startsWith('/')) {
    return `${proxyTarget.replace('://localhost', '://127.0.0.1').replace(/\/$/, '')}${configuredApiUrl}`;
  }

  return configuredApiUrl;
}

const API_BASE_URL = resolveApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function resolveAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

apiClient.interceptors.request.use(
  async (config) => {
    const token = await resolveAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalizedError = normalizeApiError(error);

    if (normalizedError.response?.status === 401) {
      await supabase.auth.signOut();
      clearAuthState();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(normalizedError);
  }
);

export { apiClient };
export default apiClient;
