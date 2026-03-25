export const WORKSPACE_VIEWS = [
  {
    path: '/',
    label: 'Calendario',
    shortLabel: 'Cal',
    shortcut: 'Alt+1',
    icon: 'calendar',
    description: 'Semana operacional'
  },
  {
    path: '/gantt',
    label: 'Gantt',
    shortLabel: 'Gan',
    shortcut: 'Alt+2',
    icon: 'gantt',
    description: 'Carga por projeto'
  },
  {
    path: '/table',
    label: 'Tabela',
    shortLabel: 'Tab',
    shortcut: 'Alt+3',
    icon: 'table',
    description: 'Leitura detalhada'
  },
  {
    path: '/charts',
    label: 'Graficos',
    shortLabel: 'Graf',
    shortcut: 'Alt+4',
    icon: 'charts',
    description: 'Analise visual'
  },
  {
    path: '/directory',
    label: 'Diretorio',
    shortLabel: 'Dir',
    shortcut: 'Alt+5',
    icon: 'directory',
    description: 'Catalogo e atividades'
  },
  {
    path: '/comparison',
    label: 'Comparacao',
    shortLabel: 'Comp',
    shortcut: 'Alt+6',
    icon: 'comparison',
    description: 'Resumo agregado'
  }
];

export function getWorkspaceViewByPath(pathname) {
  if (!pathname || pathname === '/') {
    return WORKSPACE_VIEWS[0];
  }

  return WORKSPACE_VIEWS.find((view) => view.path === pathname) || WORKSPACE_VIEWS[0];
}
