import { createContext, useState, useEffect, useContext } from 'react';
import { factorialAuthService } from '../services/api/factorialAuthService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = factorialAuthService.getToken();
    const currentUser = factorialAuthService.getUser();
    const authenticated = factorialAuthService.isAuthenticated();

    console.log('🔍 CheckAuth:', { token: !!token, user: !!currentUser, authenticated });

    setUser(currentUser);
    setIsAuthenticated(authenticated);
    setIsLoading(false);
  };

  const login = (userData) => {
    console.log('🔐 Login chamado no contexto:', userData);
    setUser(userData.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    factorialAuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
