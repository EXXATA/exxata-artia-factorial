import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/common/Button/Button';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/api/apiError';

function getBlockerContent(authBlocker) {
  if (authBlocker?.code === 'USER_PROFILE_RECONCILIATION_REQUIRED') {
    return {
      title: 'Cadastro precisa de reconciliacao',
      description: 'Sua conta Microsoft foi autenticada, mas encontramos um perfil local com outro identificador. Precisamos alinhar esse cadastro antes de liberar o acesso.',
      details: 'Esse ajuste normalmente depende de uma reconciliacao administrativa no Supabase.'
    };
  }

  return {
    title: 'Acesso pendente de provisionamento',
    description: 'Sua conta Microsoft foi autenticada com sucesso, mas seu cadastro ainda nao esta pronto para usar o sistema.',
    details: 'O acesso sera liberado assim que o vinculo com o Factorial estiver provisionado.'
  };
}

export default function AccessPendingPage() {
  const navigate = useNavigate();
  const { status, authBlocker, checkAuth, logout } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const blockerContent = useMemo(() => getBlockerContent(authBlocker), [authBlocker]);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'loading' && !authBlocker) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-light-panel dark:bg-dark-panel rounded-lg shadow-lg p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold mb-2">Validando acesso</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted">
            Estamos verificando o status do seu provisionamento.
          </p>
        </div>
      </div>
    );
  }

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const result = await checkAuth();

      if (result.status === 'authenticated') {
        toast.success('Acesso liberado. Carregando o sistema...');
        navigate('/', { replace: true });
        return;
      }

      toast('Seu acesso ainda esta pendente. Tente novamente em instantes.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel validar seu acesso agora.'));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-light-panel dark:bg-dark-panel rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 flex items-center justify-center mx-auto mb-4 text-2xl">
              !
            </div>
            <h1 className="text-2xl font-bold mb-2">{blockerContent.title}</h1>
            <p className="text-sm text-light-muted dark:text-dark-muted">
              {blockerContent.description}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-light-panel2 dark:bg-dark-panel2 rounded-lg space-y-2">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {blockerContent.details}
              </p>
              {Array.isArray(authBlocker?.data?.missing) && authBlocker.data.missing.length > 0 && (
                <p className="text-xs text-light-muted dark:text-dark-muted">
                  Pendencias atuais: {authBlocker.data.missing.join(', ')}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                className="flex-1"
                disabled={status === 'loading' || isRetrying || isSigningOut}
                onClick={handleRetry}
              >
                {isRetrying || status === 'loading' ? 'Validando...' : 'Tentar novamente'}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isRetrying || isSigningOut}
                onClick={handleLogout}
              >
                {isSigningOut ? 'Saindo...' : 'Sair'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
