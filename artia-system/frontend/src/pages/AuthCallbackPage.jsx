import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage, getAuthBlocker, isApiUnavailableError } from '../services/api/apiError';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const finishLogin = async () => {
      try {
        await microsoftAuthService.completeSignIn();
        const result = await checkAuth();

        if (!isMounted) {
          return;
        }

        if (result.status === 'authenticated' && result.user) {
          toast.success(`Bem-vindo, ${result.user.name || result.user.email || 'colaborador'}!`);
          navigate('/', { replace: true });
          return;
        }

        if (result.status === 'pending') {
          navigate('/access-pending', { replace: true });
          return;
        }

        toast.error('Nao foi possivel concluir o login Microsoft.');
        navigate('/login', { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (getAuthBlocker(error)) {
          navigate('/access-pending', { replace: true });
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
  }, [checkAuth, navigate]);

  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <section className="auth-copy">
          <h1>Concluindo autenticacao no workspace.</h1>
          <p>Estamos validando sua sessao, o provisionamento e o perfil operacional antes de abrir o sistema.</p>
        </section>

        <section className="auth-panel text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2>Concluindo login Microsoft</h2>
          <p className="auth-subtitle">Validando sua sessao e carregando seu perfil.</p>
        </section>
      </div>
    </div>
  );
}
