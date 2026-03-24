const USER_KEY = 'user';
const ARTIA_TOKEN_KEY = 'artia_token';

export function persistAuthState({ user }) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthState() {
  localStorage.removeItem(USER_KEY);
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
