import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { useGlobalAction } from '../../contexts/GlobalActionContext';
import WorkspaceHelpPanel from './WorkspaceHelpPanel';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceTopbar from './WorkspaceTopbar';
import { WORKSPACE_VIEWS, getWorkspaceViewByPath } from './workspaceNavigation';

const DataActionsModal = lazy(() => import('../import/DataActionsModal'));

function ModalLoadingFallback() {
  return (
    <div className="workspace-sheet-root">
      <div className="workspace-sheet-backdrop" />
      <div className="workspace-modal-loading">Carregando ferramentas...</div>
    </div>
  );
}

export default function WorkspaceShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuth();
  const { action, isRunning: isGlobalActionRunning, runAction } = useGlobalAction();
  const [isDataActionsOpen, setIsDataActionsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currentView = getWorkspaceViewByPath(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const targetTag = event.target?.tagName;
      const isTyping = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || event.target?.isContentEditable;

      if (isTyping || !event.altKey) {
        return;
      }

      const pressedKey = event.key.toLowerCase();

      if (pressedKey >= '1' && pressedKey <= '6') {
        const view = WORKSPACE_VIEWS[Number(pressedKey) - 1];
        if (view) {
          event.preventDefault();
          setIsMobileNavOpen(false);
          navigate(view.path);
        }
        return;
      }

      if (pressedKey === 'd') {
        event.preventDefault();
        setIsDataActionsOpen(true);
        return;
      }

      if (pressedKey === 'r') {
        event.preventDefault();
        void runAction();
        return;
      }

      if (pressedKey === 't') {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (pressedKey === 'l') {
        event.preventDefault();
        void handleLogout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logout, navigate, runAction, toggleTheme]);

  return (
    <div className="workspace-shell">
      <WorkspaceSidebar
        currentPath={currentView.path}
        isMobileOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onNavigate={(path) => {
          setIsMobileNavOpen(false);
          navigate(path);
        }}
      />

      <WorkspaceTopbar
        currentView={currentView}
        user={user}
        theme={theme}
        action={action}
        isGlobalActionRunning={isGlobalActionRunning}
        onRunAction={runAction}
        onOpenDataActions={() => setIsDataActionsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileNavOpen(true)}
      />

      <main className="app-main">
        {children}
      </main>

      <WorkspaceHelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {isDataActionsOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <DataActionsModal
            isOpen={isDataActionsOpen}
            onClose={() => setIsDataActionsOpen(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
