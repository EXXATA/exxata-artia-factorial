import { useState } from 'react';
import toast from 'react-hot-toast';
import { artiaAuthService } from '../../services/api/artiaAuthService';
import { setArtiaToken } from '../../services/auth/authStorage';
import Button from '../common/Button/Button';
import Input from '../common/Input/Input';
import Modal from '../common/Modal/Modal';

export default function ArtiaLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    setIsLoading(true);

    try {
      const response = await artiaAuthService.login(email, password);

      setArtiaToken(response.data.artiaToken);
      toast.success(`Bem-vindo, ${response.data.user.name}!`);

      if (onLoginSuccess) {
        onLoginSuccess(response.data);
      }

      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao fazer login no Artia');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Login com Artia" size="md">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="bg-light-panel2 dark:bg-dark-panel2 rounded-lg p-4 mb-4">
          <p className="text-sm text-light-muted dark:text-dark-muted">
            Use suas credenciais do Artia para sincronizar projetos e atividades sem substituir sua sessão principal do Supabase.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email do Artia</label>
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
          <label className="block text-sm font-medium mb-1">Senha do Artia</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Autenticando...' : 'Entrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
