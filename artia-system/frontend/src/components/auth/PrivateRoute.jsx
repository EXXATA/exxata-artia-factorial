import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔒 PrivateRoute:', { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-light-muted dark:text-dark-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ Não autenticado, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ Autenticado, renderizando conteúdo protegido');
  return children;
}
