import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/common/Button/Button';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/api/apiError';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);

    try {
      await microsoftAuthService.signIn();
    } catch (error) {
      setIsLoading(false);
      toast.error(getApiErrorMessage(error, 'Nao foi possivel iniciar o login Microsoft.'));
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-light-panel dark:bg-dark-panel rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_0_6px_rgba(78,161,255,0.15)]"></div>
              <h1 className="text-2xl font-bold">
                Apontamento de Horas
                <span className="text-[#d51d07] ml-1">Artia</span>
              </h1>
            </div>
            <p className="text-sm text-light-muted dark:text-dark-muted">
              Entre com sua conta corporativa Microsoft da Exxata.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="primary"
              type="button"
              disabled={isLoading || isAuthLoading}
              className="w-full"
              onClick={handleMicrosoftLogin}
            >
              {isLoading ? 'Redirecionando...' : 'Entrar com Microsoft'}
            </Button>

            <div className="p-4 bg-light-panel2 dark:bg-dark-panel2 rounded-lg">
              <p className="text-xs text-light-muted dark:text-dark-muted">
                <strong>Acesso:</strong> apenas contas corporativas <code>@exxata.com.br</code> autenticadas via Microsoft.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
