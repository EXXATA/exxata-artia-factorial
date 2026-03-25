import { useEffect, useRef, useState } from 'react';

export default function WorkspaceTopbar({
  action,
  currentView,
  isGlobalActionRunning,
  onLogout,
  onMenuToggle,
  onOpenDataActions,
  onOpenHelp,
  onRunAction,
  onToggleTheme,
  theme,
  user
}) {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef(null);

  useEffect(() => {
    if (!isOverflowOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!overflowRef.current?.contains(event.target)) {
        setIsOverflowOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOverflowOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOverflowOpen]);

  const closeOverflow = () => setIsOverflowOpen(false);

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-main">
        <button type="button" className="workspace-mobile-trigger" onClick={onMenuToggle}>
          Menu
        </button>

        <div className="workspace-topbar-copy">
          <span className="workspace-topbar-eyebrow">{currentView.shortLabel}</span>
          <div className="workspace-topbar-heading">
            <h1>{currentView.label}</h1>
            <p>{currentView.description}</p>
          </div>
        </div>
      </div>

      <div id="workspace-topbar-context" className="workspace-topbar-context" />

      <div className="workspace-topbar-actions">
        {user ? <span className="workspace-topbar-user">{user.name}</span> : null}

        <button
          type="button"
          className="workspace-action-button"
          onClick={() => void onRunAction()}
          disabled={!action || isGlobalActionRunning}
          title={action?.label || 'Atualizar a visao atual'}
        >
          <span>{isGlobalActionRunning ? 'Atualizando' : 'Atualizar'}</span>
        </button>

        <button
          type="button"
          className="workspace-action-button workspace-action-button-quiet workspace-topbar-secondary"
          onClick={onOpenDataActions}
        >
          Dados
        </button>

        <button
          type="button"
          className="workspace-action-button workspace-action-button-quiet workspace-topbar-secondary"
          onClick={onOpenHelp}
        >
          Ajuda
        </button>

        <button
          type="button"
          className="workspace-action-button workspace-action-button-quiet workspace-topbar-secondary"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </button>

        <button
          type="button"
          className="workspace-action-button workspace-action-button-quiet workspace-topbar-secondary"
          onClick={() => void onLogout()}
        >
          Sair
        </button>

        <div ref={overflowRef} className="workspace-topbar-overflow">
          <button
            type="button"
            className="workspace-action-button workspace-action-button-quiet workspace-topbar-overflow-trigger"
            aria-expanded={isOverflowOpen}
            onClick={() => setIsOverflowOpen((current) => !current)}
          >
            Mais
          </button>

          {isOverflowOpen ? (
            <div className="workspace-topbar-menu">
              <button type="button" className="workspace-topbar-menu-item" onClick={() => { closeOverflow(); onOpenDataActions(); }}>
                Dados
              </button>
              <button type="button" className="workspace-topbar-menu-item" onClick={() => { closeOverflow(); onOpenHelp(); }}>
                Ajuda
              </button>
              <button type="button" className="workspace-topbar-menu-item" onClick={() => { closeOverflow(); onToggleTheme(); }}>
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
              <button type="button" className="workspace-topbar-menu-item workspace-topbar-menu-item-danger" onClick={() => { closeOverflow(); void onLogout(); }}>
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
