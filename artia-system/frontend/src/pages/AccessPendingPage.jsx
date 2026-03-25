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
      description: 'Sua conta Microsoft foi autenticada, mas existe um perfil local com outro identificador.',
      details: 'Esse ajuste normalmente depende de uma reconciliacao administrativa no Supabase.'
    };
  }

  return {
    title: 'Acesso pendente de provisionamento',
    description: 'Sua conta foi autenticada, mas o vinculo operacional ainda nao esta pronto para liberar o uso.',
    details: 'O acesso sera liberado assim que o cadastro estiver provisionado com o Factorial.'
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
      <div className="auth-screen">
        <div className="auth-shell">
          <section className="auth-panel max-w-xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2>Validando acesso</h2>
            <p className="auth-subtitle">Estamos verificando o status do seu provisionamento.</p>
          </section>
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
    <div className="auth-screen">
      <div className="auth-shell">
        <section className="auth-copy">
          <h1>O acesso ainda esta em preparacao.</h1>
          <p>
            A autenticacao funcionou, mas o sistema ainda aguarda o alinhamento completo do seu cadastro.
            Quando o provisionamento terminar, voce entra no mesmo workspace redesenhado.
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-brand">
            <div className="auth-brand-mark" />
            <div>
              <h2>{blockerContent.title}</h2>
              <p className="auth-subtitle">{blockerContent.description}</p>
            </div>
          </div>

          <div className="auth-note">
            {blockerContent.details}
            {Array.isArray(authBlocker?.data?.missing) && authBlocker.data.missing.length > 0 ? (
              <div className="mt-2 text-xs">
                Pendencias atuais: {authBlocker.data.missing.join(', ')}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
        </section>
      </div>
    </div>
  );
}
