import { WORKSPACE_VIEWS } from './workspaceNavigation';

function WorkspaceNavGlyph({ name }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.7
  };

  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3.5" y="4.5" width="13" height="12" rx="3" {...commonProps} />
        <path d="M6.5 2.75V6.25M13.5 2.75V6.25M3.5 8.25H16.5" {...commonProps} />
      </svg>
    );
  }

  if (name === 'gantt') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 4.25V15.75" {...commonProps} />
        <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="5" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="5" cy="14" r="1" fill="currentColor" stroke="none" />
        <rect x="7" y="4.75" width="8" height="2.5" rx="1.25" {...commonProps} />
        <rect x="9" y="8.75" width="6" height="2.5" rx="1.25" {...commonProps} />
        <rect x="7.75" y="12.75" width="7.25" height="2.5" rx="1.25" {...commonProps} />
      </svg>
    );
  }

  if (name === 'table') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3.5" y="4.5" width="13" height="11" rx="2.5" {...commonProps} />
        <path d="M3.5 8.25H16.5M7.8 4.5V15.5M12.2 4.5V15.5" {...commonProps} />
      </svg>
    );
  }

  if (name === 'charts') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 15.5V10.5M9.5 15.5V6.5M15 15.5V8.5M3.5 15.5H16.5" {...commonProps} />
        <path d="M4 10.5L9.5 6.5L15 8.5" {...commonProps} />
      </svg>
    );
  }

  if (name === 'directory') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 6.25H8L9.25 7.75H16A1.5 1.5 0 0 1 17.5 9.25V14.5A1.5 1.5 0 0 1 16 16H4A1.5 1.5 0 0 1 2.5 14.5V7.75A1.5 1.5 0 0 1 4 6.25Z" {...commonProps} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 5.5H10.5A3 3 0 0 1 13.5 8.5V10.25A3 3 0 0 0 16.5 13.25H15.75M15.5 14.5H9.5A3 3 0 0 1 6.5 11.5V9.75A3 3 0 0 0 3.5 6.75H4.25" {...commonProps} />
      <path d="M13.5 4.75L16.5 5.5L15.75 8.5M6.5 15.25L3.5 14.5L4.25 11.5" {...commonProps} />
    </svg>
  );
}

export default function WorkspaceSidebar({ currentPath, isMobileOpen, onClose, onNavigate }) {
  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu lateral"
        className={`workspace-mobile-overlay ${isMobileOpen ? 'workspace-mobile-overlay-visible' : ''}`}
        onClick={onClose}
      />

      <aside className="workspace-sidebar" data-mobile-open={isMobileOpen ? 'true' : 'false'}>
        <div className="workspace-sidebar-panel">
          <div className="workspace-sidebar-brand">
            <div className="workspace-sidebar-brand-mark" />
            <div className="workspace-sidebar-brand-copy">
              <span className="workspace-sidebar-brand-title">Apontamento</span>
              <span className="workspace-sidebar-brand-subtitle">Horas Artia</span>
            </div>
          </div>

          <nav className="workspace-sidebar-nav" aria-label="Navegacao principal">
            {WORKSPACE_VIEWS.map((view) => {
              const isActive = currentPath === view.path;

              return (
                <button
                  key={view.path}
                  type="button"
                  onClick={() => onNavigate(view.path)}
                  className={`workspace-nav-item ${isActive ? 'workspace-nav-item-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="workspace-nav-icon" aria-hidden="true">
                    <WorkspaceNavGlyph name={view.icon} />
                  </span>
                  <span className="workspace-nav-content">
                    <span className="workspace-nav-label">{view.label}</span>
                    <span className="workspace-nav-meta">
                      <span>{view.description}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
