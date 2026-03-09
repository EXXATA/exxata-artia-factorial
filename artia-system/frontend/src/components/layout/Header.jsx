import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import DataActionsModal from '../import/DataActionsModal';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuth();
  const [isDataActionsOpen, setIsDataActionsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const views = [
    { path: '/', label: 'Calendário', shortcut: 'Alt+1' },
    { path: '/gantt', label: 'Gantt', shortcut: 'Alt+2' },
    { path: '/table', label: 'Tabela', shortcut: 'Alt+3' },
    { path: '/charts', label: 'Gráficos', shortcut: 'Alt+4' },
    { path: '/directory', label: 'Diretório', shortcut: 'Alt+5' },
    { path: '/comparison', label: 'Comparação', shortcut: 'Alt+6' }
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      const targetTag = event.target?.tagName;
      const isTyping = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || event.target?.isContentEditable;

      if (isTyping || !event.altKey) {
        return;
      }

      const pressedKey = event.key.toLowerCase();

      if (pressedKey >= '1' && pressedKey <= '6') {
        const view = views[Number(pressedKey) - 1];
        if (view) {
          event.preventDefault();
          navigate(view.path);
        }
        return;
      }

      if (pressedKey === 'd') {
        event.preventDefault();
        setIsDataActionsOpen(true);
        return;
      }

      if (pressedKey === 't') {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (pressedKey === 'l') {
        event.preventDefault();
        handleLogout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, toggleTheme]);

  return (
    <header className="app-header-surface">
      <div className="py-3">
        <div className="app-header-row">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(78,161,255,0.12)]"></div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                Apontamento de Horas
                <span className="ml-1 text-primary">Artia</span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="app-brand-chip">Fonte: MySQL Artia</span>
                <span className="app-brand-chip">Alt+D Dados</span>
                <span className="app-brand-chip">Alt+T Tema</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <span className="app-brand-chip">
                {user.name}
              </span>
            )}
            <button
              onClick={() => setIsDataActionsOpen(true)}
              className="app-action-button"
              title="Importar e exportar dados"
            >
              Dados
              <span className="text-[11px] text-slate-400">Alt+D</span>
            </button>
            <button
              onClick={toggleTheme}
              className="app-action-button"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
              <span className="text-[11px] text-slate-400">Alt+T</span>
            </button>
            <button
              onClick={handleLogout}
              className="app-action-button"
              title="Sair"
            >
              Sair
              <span className="text-[11px] text-slate-400">Alt+L</span>
            </button>
          </div>
        </div>

        <nav className="app-tab-nav mt-3">
          {views.map((view) => {
            const isActive = location.pathname === view.path;

            return (
              <button
                key={view.path}
                onClick={() => navigate(view.path)}
                className={`app-tab ${isActive ? 'app-tab-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{view.label}</span>
                <span className={`text-[11px] ${isActive ? 'text-primary-light dark:text-primary-light' : 'text-slate-400 dark:text-slate-500'}`}>
                  {view.shortcut}
                </span>
              </button>
            );
          })}
        </nav>

        <DataActionsModal
          isOpen={isDataActionsOpen}
          onClose={() => setIsDataActionsOpen(false)}
        />
      </div>
    </header>
  );
}
