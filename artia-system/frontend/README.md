# Artia Frontend - React App

Frontend do sistema Artia construído com React, Vite e TailwindCSS.

## Tecnologias

- **React 18**: Biblioteca UI
- **Vite**: Build tool e dev server
- **TailwindCSS**: Framework CSS utility-first
- **Zustand**: State management
- **React Query**: Cache e sincronização de dados
- **Axios**: Cliente HTTP
- **React Router**: Roteamento
- **Chart.js**: Gráficos
- **React Hot Toast**: Notificações

## Estrutura

```
src/
├── components/        # Componentes React
│   ├── common/       # Componentes reutilizáveis
│   ├── layout/       # Layout e navegação
│   ├── calendar/     # View Calendário
│   ├── gantt/        # View Gantt
│   ├── table/        # View Tabela
│   ├── charts/       # View Gráficos
│   └── directory/    # View Diretório
├── hooks/            # Custom hooks
├── services/         # Serviços de API
│   ├── api/         # Cliente API e serviços
│   ├── storage/     # IndexedDB/LocalStorage
│   └── websocket/   # WebSocket para presença
├── store/           # State management
│   └── slices/      # Zustand slices
├── utils/           # Funções utilitárias
└── styles/          # Estilos globais
```

## Instalação

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - Inicia dev server (porta 5173)
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run lint` - Executa ESLint

## Variáveis de Ambiente

Crie um arquivo `.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Views

### Calendário
Visualização semanal de eventos com drag & drop.

### Gantt
Visualização de projetos e distribuição de horas por dia.

### Tabela
Listagem detalhada de todos os eventos com filtros.

### Gráficos
Análise visual de horas por projeto e período.

### Diretório
Busca e navegação de projetos e atividades.

## State Management

Usando Zustand para gerenciamento de estado:

- `uiSlice`: Tema, view atual, semana selecionada
- `eventsSlice`: Eventos e seleção
- `projectsSlice`: Projetos e atividades

## API Integration

Todos os serviços de API estão em `src/services/api/`:

- `eventService`: CRUD de eventos
- `projectService`: Gestão de projetos
- `exportService`: Exportação CSV/XLSX

## Temas

Suporte a tema dark e light com TailwindCSS.

Alternar tema:
```javascript
const { theme, toggleTheme } = useThemeStore();
```

## Build

```bash
npm run build
```

O build otimizado será gerado em `dist/`.
