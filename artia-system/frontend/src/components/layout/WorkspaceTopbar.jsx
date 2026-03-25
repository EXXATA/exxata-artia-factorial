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

        <button type="button" className="workspace-action-button workspace-action-button-quiet" onClick={onOpenDataActions}>
          Dados
        </button>

        <button type="button" className="workspace-action-button workspace-action-button-quiet" onClick={onOpenHelp}>
          Ajuda
        </button>

        <button type="button" className="workspace-action-button workspace-action-button-quiet" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </button>

        <button type="button" className="workspace-action-button workspace-action-button-quiet" onClick={() => void onLogout()}>
          Sair
        </button>
      </div>
    </header>
  );
}
