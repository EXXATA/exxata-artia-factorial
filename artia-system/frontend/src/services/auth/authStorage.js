const USER_KEY = 'user';

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
