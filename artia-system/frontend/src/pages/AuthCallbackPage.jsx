import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage, isApiUnavailableError } from '../services/api/apiError';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const finishLogin = async () => {
      try {
        const authData = await microsoftAuthService.completeSignIn();
        const currentUser = await login(authData);

        if (!isMounted) {
          return;
        }

        toast.success(`Bem-vindo, ${currentUser?.name || currentUser?.email || 'colaborador'}!`);
        navigate('/', { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (!isApiUnavailableError(error)) {
          await microsoftAuthService.logout();
        }

        toast.error(getApiErrorMessage(error, 'Nao foi possivel concluir o login Microsoft.'));
        navigate('/login', { replace: true });
      }
    };

    void finishLogin();

    return () => {
      isMounted = false;
    };
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="bg-light-panel dark:bg-dark-panel rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Concluindo login Microsoft</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">
          Estamos validando sua sessao e carregando seu perfil.
        </p>
      </div>
    </div>
  );
}
