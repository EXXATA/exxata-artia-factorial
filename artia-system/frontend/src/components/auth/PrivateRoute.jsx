import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function PrivateRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-light-muted dark:text-dark-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return <Navigate to="/access-pending" replace />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
