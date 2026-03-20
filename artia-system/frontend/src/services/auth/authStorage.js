const AUTH_TOKEN_KEY = 'auth_token';
const LEGACY_TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ARTIA_TOKEN_KEY = 'artia_token';

export function persistAuthState({ session, user }) {
  if (session?.accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, session.accessToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, session.accessToken);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(USER_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
}

export function setArtiaToken(token) {
  if (!token) {
    localStorage.removeItem(ARTIA_TOKEN_KEY);
    return;
  }

  localStorage.setItem(ARTIA_TOKEN_KEY, token);
}

export function getArtiaToken() {
  return localStorage.getItem(ARTIA_TOKEN_KEY);
}

export function clearArtiaToken() {
  localStorage.removeItem(ARTIA_TOKEN_KEY);
}
