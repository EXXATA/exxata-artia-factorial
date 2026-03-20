import axios from 'axios';
import { clearAuthState, getStoredToken } from '../auth/authStorage';
import { supabase } from '../supabase/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
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
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      clearAuthState();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
