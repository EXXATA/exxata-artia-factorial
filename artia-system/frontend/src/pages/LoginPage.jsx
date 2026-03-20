import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import { useAuth } from '../hooks/useAuth';
import { factorialAuthService } from '../services/api/factorialAuthService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = isFirstAccess
        ? await factorialAuthService.register(email, password)
        : await factorialAuthService.login(email, password);

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      await login(response.data);
      toast.success(`Bem-vindo, ${response.data.user.name}!`);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setIsLoading(false);
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
              {isFirstAccess ? 'Crie sua conta' : 'Entre com suas credenciais'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email do Factorial
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@empresa.com"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Senha {isFirstAccess && '(mínimo 8 caracteres)'}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading
                  ? (isFirstAccess ? 'Criando conta...' : 'Autenticando...')
                  : (isFirstAccess ? 'Criar Conta' : 'Entrar')
                }
              </Button>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsFirstAccess(!isFirstAccess)}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                {isFirstAccess ? 'Já tenho conta' : 'Primeiro acesso?'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-light-panel2 dark:bg-dark-panel2 rounded-lg">
            <p className="text-xs text-light-muted dark:text-dark-muted">
              <strong>Nota:</strong> {isFirstAccess
                ? 'Seu email deve estar cadastrado no Factorial. A conta será criada após validação.'
                : 'Use o email do Factorial e a senha que você criou no primeiro acesso.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
