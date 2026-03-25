import { WORKSPACE_VIEWS } from './workspaceNavigation';

const GLOBAL_SHORTCUTS = [
  { label: 'Atualizar visao atual', shortcut: 'Alt+R' },
  { label: 'Abrir acoes de dados', shortcut: 'Alt+D' },
  { label: 'Alternar tema', shortcut: 'Alt+T' },
  { label: 'Encerrar sessao', shortcut: 'Alt+L' }
];

export default function WorkspaceHelpPanel({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="workspace-sheet-root" role="dialog" aria-modal="true" aria-label="Ajuda e atalhos">
      <button type="button" className="workspace-sheet-backdrop" onClick={onClose} aria-label="Fechar ajuda" />

      <aside className="workspace-sheet">
        <div className="workspace-sheet-header">
          <div>
            <span className="workspace-sheet-eyebrow">Ajuda</span>
            <h2>Atalhos e estrutura do workspace</h2>
            <p>Os atalhos e a legenda saem da tela principal para manter o conteudo em foco.</p>
          </div>

          <button type="button" className="workspace-sheet-close" onClick={onClose}>
            Fechar
          </button>
        </div>

        <section className="workspace-sheet-section">
          <h3>Navegacao</h3>
          <div className="workspace-sheet-list">
            {WORKSPACE_VIEWS.map((view) => (
              <div key={view.path} className="workspace-sheet-item">
                <div>
                  <strong>{view.label}</strong>
                  <span>{view.description}</span>
                </div>
                <span className="workspace-sheet-shortcut">{view.shortcut}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-sheet-section">
          <h3>Acoes globais</h3>
          <div className="workspace-sheet-list">
            {GLOBAL_SHORTCUTS.map((item) => (
              <div key={item.shortcut} className="workspace-sheet-item">
                <div>
                  <strong>{item.label}</strong>
                  <span>Disponivel em qualquer aba autenticada</span>
                </div>
                <span className="workspace-sheet-shortcut">{item.shortcut}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-sheet-section">
          <h3>Padrao visual</h3>
          <ul className="workspace-muted-list">
            <li>Filtros essenciais ficam no topo da propria aba.</li>
            <li>O conteudo principal ocupa a maior area util possivel da tela.</li>
            <li>Resumo e apoio aparecem apenas quando a propria aba realmente precisa deles.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
