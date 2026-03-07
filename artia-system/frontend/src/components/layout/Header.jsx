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
    <header className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(18,27,41,0.96),rgba(8,12,19,0.98))] shadow-[0_14px_50px_rgba(0,0,0,0.28)]">
      <div className="px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(78,161,255,0.15)]"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Apontamento de Horas
                <span className="ml-1 text-[#d51d07]">Artia</span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
                  Fonte: MySQL Artia
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  Alt+D Dados
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  Alt+T Tema
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {user && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                {user.name}
              </span>
            )}
            <button
              onClick={() => setIsDataActionsOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 transition hover:bg-white/10"
              title="Importar e exportar dados"
            >
              Dados
              <span className="ml-2 text-xs text-slate-400">Alt+D</span>
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 transition hover:bg-white/10"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
              <span className="ml-2 text-xs text-slate-400">Alt+T</span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100 transition hover:bg-white/10"
              title="Sair"
            >
              Sair
              <span className="ml-2 text-xs text-slate-400">Alt+L</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {views.map((view) => (
            <button
              key={view.path}
              onClick={() => navigate(view.path)}
              className={`group rounded-2xl border px-4 py-2.5 text-left transition ${
                location.pathname === view.path
                  ? 'border-primary/50 bg-primary/20 text-white shadow-[0_8px_24px_rgba(78,161,255,0.25)]'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-semibold">{view.label}</div>
              <div className={`text-[11px] ${location.pathname === view.path ? 'text-primary-light' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {view.shortcut}
              </div>
            </button>
          ))}
        </div>

        <DataActionsModal
          isOpen={isDataActionsOpen}
          onClose={() => setIsDataActionsOpen(false)}
        />
      </div>
    </header>
  );
}
