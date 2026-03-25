import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/common/Button/Button';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/api/apiError';
import { microsoftAuthService } from '../services/auth/microsoftAuthService';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { status, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }

    if (status === 'pending') {
      navigate('/access-pending', { replace: true });
    }
  }, [status, navigate]);

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
    <div className="auth-screen">
      <div className="auth-shell">
        <section className="auth-copy">
          <h1>Apontamento limpo, objetivo e pronto para operar.</h1>
          <p>
            O workspace foi redesenhado para colocar o calendario e a leitura operacional em primeiro plano.
            Entre com sua conta corporativa para acessar o ambiente.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              Menu lateral recolhido, conteudo principal dominante e contexto sempre sob demanda.
            </div>
            <div className="auth-highlight">
              Conciliacao, atalhos e apoio ficam fora da superficie principal para reduzir ruido visual.
            </div>
            <div className="auth-highlight">
              Acesso permitido somente para contas Microsoft corporativas da Exxata.
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-brand">
            <div className="auth-brand-mark" />
            <div>
              <h2>Apontamento de Horas Artia</h2>
              <p className="auth-subtitle">Entre com sua conta corporativa Microsoft da Exxata.</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Button
              variant="primary"
              type="button"
              disabled={isLoading || isAuthLoading}
              className="w-full"
              onClick={handleMicrosoftLogin}
            >
              {isLoading ? 'Redirecionando...' : 'Entrar com Microsoft'}
            </Button>

            <div className="auth-note">
              <strong>Acesso:</strong> apenas contas corporativas <code>@exxata.com.br</code> autenticadas via Microsoft.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
