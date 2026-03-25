import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/slices/uiSlice';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AccessPendingPage from './pages/AccessPendingPage';
import PrivateRoute from './components/auth/PrivateRoute';

const ProtectedLayout = lazy(() => import('./components/layout/ProtectedLayout'));

function ProtectedAppFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-light-muted dark:text-dark-muted">Carregando aplicacao...</p>
      </div>
    </div>
  );
}

function App() {
  const { theme } = useThemeStore();

  return (
    <div className={theme}>
      <div className="app-shell">
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/access-pending" element={<AccessPendingPage />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Suspense fallback={<ProtectedAppFallback />}>
                      <ProtectedLayout />
                    </Suspense>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </div>
    </div>
  );
}

export default App;
