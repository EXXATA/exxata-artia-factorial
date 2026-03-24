import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/api/authService';
import { isApiUnavailableError } from '../services/api/apiError';
import { clearAuthState, getStoredUser } from '../services/auth/authStorage';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);

async function getSessionAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredUser()));
  const [isLoading, setIsLoading] = useState(true);
  const lastResolvedTokenRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const applyLocalState = (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setIsLoading(false);
    };

    const clearSessionState = () => {
      clearAuthState();
      authService.resetCurrentUserCache();
      lastResolvedTokenRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    const handleProfileResolutionError = async (error) => {
      if (!isMounted) {
        return null;
      }

      if (isApiUnavailableError(error)) {
        const storedUser = getStoredUser();
        lastResolvedTokenRef.current = null;
        setUser(storedUser);
        setIsAuthenticated(Boolean(storedUser));
        setIsLoading(false);
        return null;
      }

      await microsoftAuthService.logout();
      clearSessionState();
      return null;
    };

    const syncCurrentUser = async ({ force = false } = {}) => {
      const accessToken = await getSessionAccessToken();
      const storedUser = getStoredUser();

      if (!accessToken) {
        clearSessionState();
        return null;
      }

      if (!force && storedUser && lastResolvedTokenRef.current === accessToken) {
        applyLocalState(storedUser);
        return storedUser;
      }

      try {
        const currentUser = await authService.getCurrentUser({ force });

        if (!isMounted) {
          return null;
        }

        lastResolvedTokenRef.current = accessToken;
        applyLocalState(currentUser);
        return currentUser;
      } catch (error) {
        return handleProfileResolutionError(error);
      }
    };

    const initializeAuth = async () => {
      try {
        const restoredSession = await microsoftAuthService.restoreSession();

        if (!isMounted) {
          return;
        }

        if (!restoredSession?.user) {
          clearSessionState();
          return;
        }

        lastResolvedTokenRef.current = restoredSession.session?.accessToken || null;
        applyLocalState(restoredSession.user);
      } catch (error) {
        await handleProfileResolutionError(error);
      }
    };

    void initializeAuth();

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

      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }

      setIsLoading(false);

      if (storedUser && lastResolvedTokenRef.current === session.access_token) {
        return;
      }

      void syncCurrentUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);

    try {
      const restoredSession = await microsoftAuthService.restoreSession({ forceUserSync: true });
      const currentUser = restoredSession?.user || null;

      lastResolvedTokenRef.current = restoredSession?.session?.accessToken || null;
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      return currentUser;
    } catch (error) {
      if (isApiUnavailableError(error)) {
        setIsLoading(false);
        return null;
      }

      await microsoftAuthService.logout();
      clearAuthState();
      authService.resetCurrentUserCache();
      lastResolvedTokenRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (authData = null) => {
    if (authData?.user) {
      const accessToken = await getSessionAccessToken();
      lastResolvedTokenRef.current = accessToken;
      setUser(authData.user);
      setIsAuthenticated(Boolean(authData.user));
      return authData.user;
    }

    const currentUser = await authService.getCurrentUser();
    const accessToken = await getSessionAccessToken();
    lastResolvedTokenRef.current = accessToken;
    setUser(currentUser);
    setIsAuthenticated(Boolean(currentUser));
    return currentUser;
  };

  const logout = async () => {
    await microsoftAuthService.logout();
    lastResolvedTokenRef.current = null;
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
