import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/api/authService';
import { getAuthBlocker, isApiUnavailableError } from '../services/api/apiError';
import { clearAuthState, getStoredUser } from '../services/auth/authStorage';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';
import { supabase } from '../services/supabase/supabaseClient';

const AuthContext = createContext(null);
const initialUser = getStoredUser();

async function getSessionAccessToken() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [status, setStatus] = useState('loading');
  const [authBlocker, setAuthBlocker] = useState(null);
  const lastResolvedTokenRef = useRef(null);
  const isMountedRef = useRef(false);
  const userRef = useRef(initialUser);
  const statusRef = useRef('loading');
  const authBlockerRef = useRef(null);

  const commitState = ({ user: nextUser, status: nextStatus, authBlocker: nextAuthBlocker = null }) => {
    userRef.current = nextUser;
    statusRef.current = nextStatus;
    authBlockerRef.current = nextAuthBlocker;

    if (isMountedRef.current) {
      setUser(nextUser);
      setStatus(nextStatus);
      setAuthBlocker(nextAuthBlocker);
    }

    return {
      status: nextStatus,
      user: nextUser,
      blocker: nextAuthBlocker
    };
  };

  const getCurrentSnapshot = () => ({
    user: userRef.current,
    status: statusRef.current,
    authBlocker: authBlockerRef.current
  });

  const applyAuthenticatedState = (currentUser) => commitState({
    user: currentUser,
    status: 'authenticated',
    authBlocker: null
  });

  const applyPendingState = (blocker) => {
    clearAuthState();
    authService.resetCurrentUserCache();
    lastResolvedTokenRef.current = null;

    return commitState({
      user: null,
      status: 'pending',
      authBlocker: blocker
    });
  };

  const clearSessionState = () => {
    clearAuthState();
    authService.resetCurrentUserCache();
    lastResolvedTokenRef.current = null;

    return commitState({
      user: null,
      status: 'anonymous',
      authBlocker: null
    });
  };

  const applyApiUnavailableFallback = (previousSnapshot = getCurrentSnapshot()) => {
    const storedUser = getStoredUser();

    if (storedUser) {
      lastResolvedTokenRef.current = null;
      return applyAuthenticatedState(storedUser);
    }

    if (previousSnapshot.status === 'pending' && previousSnapshot.authBlocker) {
      return commitState({
        user: null,
        status: 'pending',
        authBlocker: previousSnapshot.authBlocker
      });
    }

    return commitState({
      user: null,
      status: 'anonymous',
      authBlocker: null
    });
  };

  const handleProfileResolutionError = async (error, { previousSnapshot = getCurrentSnapshot() } = {}) => {
    const blocker = getAuthBlocker(error);

    if (blocker) {
      return applyPendingState(blocker);
    }

    if (isApiUnavailableError(error)) {
      return applyApiUnavailableFallback(previousSnapshot);
    }

    await microsoftAuthService.logout();
    return clearSessionState();
  };

  const syncCurrentUser = async ({ force = false } = {}) => {
    const accessToken = await getSessionAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken) {
      return clearSessionState();
    }

    if (!force && storedUser && statusRef.current === 'authenticated' && lastResolvedTokenRef.current === accessToken) {
      return applyAuthenticatedState(storedUser);
    }

    const previousSnapshot = getCurrentSnapshot();

    try {
      const currentUser = await authService.getCurrentUser({ force });

      if (!currentUser) {
        return clearSessionState();
      }

      lastResolvedTokenRef.current = accessToken;
      return applyAuthenticatedState(currentUser);
    } catch (error) {
      return handleProfileResolutionError(error, { previousSnapshot });
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      const previousSnapshot = getCurrentSnapshot();
      commitState({
        user: previousSnapshot.user,
        status: 'loading',
        authBlocker: previousSnapshot.authBlocker
      });

      try {
        const restoredSession = await microsoftAuthService.restoreSession();

        if (!restoredSession?.user) {
          clearSessionState();
          return;
        }

        lastResolvedTokenRef.current = restoredSession.session?.accessToken || null;
        applyAuthenticatedState(restoredSession.user);
      } catch (error) {
        await handleProfileResolutionError(error, { previousSnapshot });
      }
    };

    void initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearSessionState();
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser) {
        applyAuthenticatedState(storedUser);
      } else if (statusRef.current === 'pending' && authBlockerRef.current) {
        commitState({
          user: null,
          status: 'pending',
          authBlocker: authBlockerRef.current
        });
      } else {
        commitState({
          user: null,
          status: 'loading',
          authBlocker: null
        });
      }

      if (storedUser && lastResolvedTokenRef.current === session.access_token) {
        return;
      }

      void syncCurrentUser();
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const previousSnapshot = getCurrentSnapshot();
    commitState({
      user: previousSnapshot.user,
      status: 'loading',
      authBlocker: previousSnapshot.authBlocker
    });

    try {
      const restoredSession = await microsoftAuthService.restoreSession({ forceUserSync: true });
      const currentUser = restoredSession?.user || null;

      if (!currentUser) {
        return clearSessionState();
      }

      lastResolvedTokenRef.current = restoredSession?.session?.accessToken || null;
      return applyAuthenticatedState(currentUser);
    } catch (error) {
      return handleProfileResolutionError(error, { previousSnapshot });
    }
  };

  const login = async () => checkAuth();

  const logout = async () => {
    await microsoftAuthService.logout();
    clearSessionState();
  };

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return (
    <AuthContext.Provider value={{
      user,
      status,
      authBlocker,
      isAuthenticated,
      isLoading,
      login,
      logout,
      checkAuth
    }}>
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
