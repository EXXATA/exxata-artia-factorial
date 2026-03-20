import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api/authService';
import { factorialAuthService } from '../services/api/factorialAuthService';
import { clearAuthState, clearArtiaToken, getStoredToken, getStoredUser } from '../services/auth/authStorage';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredToken()));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let syncTimeoutId = null;

    const clearSessionState = () => {
      clearAuthState();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    const syncCurrentUser = () => {
      if (syncTimeoutId) {
        window.clearTimeout(syncTimeoutId);
      }

      syncTimeoutId = window.setTimeout(async () => {
        try {
          const currentUser = await authService.getCurrentUser();

          if (!isMounted) {
            return;
          }

          setUser(currentUser);
          setIsAuthenticated(Boolean(currentUser));
        } catch (_error) {
          if (!isMounted) {
            return;
          }

          await authService.logout();
          clearSessionState();
          return;
        }

        if (isMounted) {
          setIsLoading(false);
        }
      }, 0);
    };

    const initializeAuth = async () => {
      try {
        const restoredSession = await factorialAuthService.restoreSession();

        if (!isMounted) {
          return;
        }

        if (restoredSession.success && restoredSession.data?.user) {
          setUser(restoredSession.data.user);
          setIsAuthenticated(true);
        } else {
          clearSessionState();
          return;
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session) {
        clearSessionState();
        return;
      }

      setIsAuthenticated(true);

      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      setIsLoading(false);
      syncCurrentUser();
    });

    return () => {
      isMounted = false;

      if (syncTimeoutId) {
        window.clearTimeout(syncTimeoutId);
      }

      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);

    try {
      const restoredSession = await factorialAuthService.restoreSession();
      const currentUser = restoredSession.data?.user || null;

      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser || getStoredToken()));
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (authData) => {
    const currentUser = authData?.user || (await authService.getCurrentUser());
    setUser(currentUser);
    setIsAuthenticated(Boolean(currentUser || getStoredToken()));
    return currentUser;
  };

  const logout = async () => {
    await factorialAuthService.logout();
    clearArtiaToken();
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
