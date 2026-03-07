# Sistema Artia - Apontamento de Horas

Sistema de apontamento de horas refatorado com arquitetura DDD (Domain-Driven Design), separando backend e frontend.

## 🏗️ Arquitetura

### Backend (Node.js + Express)
- **Domain Layer**: Entidades, Value Objects, Repositórios (interfaces), Serviços de Domínio
- **Application Layer**: Use Cases, DTOs
- **Infrastructure Layer**: Implementações de Repositórios (MongoDB), File Storage, Cache
- **Presentation Layer**: Controllers, Routes, Middlewares, Validators

### Frontend (React + Vite)
- **Components**: Componentes React organizados por feature
- **Services**: Camada de comunicação com API
- **Hooks**: Custom hooks para lógica reutilizável
- **Store**: Gerenciamento de estado com Zustand
- **Utils**: Funções utilitárias

## 🚀 Tecnologias

### Backend
- Node.js 20+
- Express.js
- MongoDB + Mongoose
- JWT para autenticação
- Joi para validação
- ExcelJS para manipulação de arquivos
- Helmet, CORS, Rate Limiting para segurança

### Frontend
- React 18+
- Vite
- TailwindCSS
- Zustand (state management)
- React Query (cache de API)
- Axios
- Chart.js
- React Hot Toast

## 📦 Instalação

### Pré-requisitos
- Node.js 20+
- MongoDB 7+
- Docker e Docker Compose (opcional)

### Instalação Local

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente no .env
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Instalação com Docker

```bash
docker-compose up -d
```

O sistema estará disponível em:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MongoDB: localhost:27017

## 🔐 Segurança

### APIs Protegidas
- **Autenticação JWT**: Tokens com expiração configurável
- **Rate Limiting**: 100 requisições/minuto por IP
- **Validação de Entrada**: Joi/Express Validator
- **Helmet.js**: Headers de segurança HTTP
- **CORS**: Configurado para origens permitidas
- **HTTPS**: Obrigatório em produção

### Middlewares de Segurança
- `authMiddleware`: Verificação de JWT
- `rateLimitMiddleware`: Proteção contra DDoS
- `validationMiddleware`: Validação de schemas
- `errorHandler`: Tratamento centralizado de erros

## 📡 API Endpoints

### Eventos
- `POST /api/v1/events` - Criar evento
- `GET /api/v1/events` - Listar eventos (com filtros)
- `GET /api/v1/events/:id` - Obter evento específico
- `PUT /api/v1/events/:id` - Atualizar evento
- `PATCH /api/v1/events/:id/move` - Mover evento
- `DELETE /api/v1/events/:id` - Deletar evento

### Projetos
- `GET /api/v1/projects` - Listar projetos
- `GET /api/v1/projects/search` - Buscar projetos
- `GET /api/v1/projects/:id/activities` - Listar atividades
- `POST /api/v1/projects/import` - Importar base de IDs (XLSX)

### Exportação
- `GET /api/v1/exports/csv` - Exportar CSV
- `GET /api/v1/exports/xlsx` - Exportar XLSX

## 🧪 Testes

### Backend
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend
```bash
cd frontend
npm test
```

## 📝 Variáveis de Ambiente

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/artia
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
```

## 🎯 Features Implementadas

### Backend
- ✅ Arquitetura DDD completa
- ✅ CRUD de eventos com validação
- ✅ Gestão de projetos e atividades
- ✅ Importação de base de IDs (XLSX)
- ✅ Exportação CSV e XLSX
- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Validação de schemas
- ✅ Tratamento de erros centralizado

### Frontend
- ✅ Estrutura de componentes React
- ✅ Roteamento com React Router
- ✅ State management com Zustand
- ✅ Cache de API com React Query
- ✅ Tema dark/light
- ✅ Views: Calendário, Gantt, Tabela, Gráficos, Diretório
- ✅ Integração com API backend

## 🔄 Migração do Sistema Antigo

O sistema original estava em um único arquivo HTML de 257KB. A refatoração trouxe:

1. **Separação de Responsabilidades**: Front e back independentes
2. **Manutenibilidade**: Código organizado em camadas DDD
3. **Escalabilidade**: Arquitetura preparada para crescimento
4. **Testabilidade**: Componentes isolados e testáveis
5. **Segurança**: APIs protegidas com autenticação e validação
6. **Performance**: Otimizações de cache e lazy loading

## 📚 Estrutura de Diretórios

```
artia-system/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── domain/         # Camada de Domínio
│   │   ├── application/    # Casos de Uso
│   │   ├── infrastructure/ # Repositórios, File Storage
│   │   ├── presentation/   # Controllers, Routes
│   │   └── config/         # Configurações
│   └── tests/              # Testes
├── frontend/               # React App
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── hooks/         # Custom Hooks
│   │   ├── services/      # API Services
│   │   ├── store/         # State Management
│   │   └── utils/         # Utilitários
│   └── public/            # Assets estáticos
├── shared/                # Código compartilhado
└── docker-compose.yml     # Orquestração
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT License

## 👥 Autores

Sistema refatorado seguindo princípios de DDD e Clean Architecture.
