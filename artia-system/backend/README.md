# Artia Backend - API REST

Backend do sistema Artia seguindo arquitetura DDD (Domain-Driven Design).

## Estrutura DDD

### Domain Layer (Camada de Domínio)
Contém a lógica de negócio pura, independente de frameworks.

- **Entities**: Event, Project, Activity, User
- **Value Objects**: TimeRange, DateRange, Email
- **Repositories (Interfaces)**: IEventRepository, IProjectRepository
- **Domain Services**: EventValidationService, TimeCalculationService, IdLookupService

### Application Layer (Camada de Aplicação)
Orquestra a lógica de negócio através de casos de uso.

- **Use Cases**: CreateEvent, UpdateEvent, DeleteEvent, ListEvents, MoveEvent, ImportProjects, ExportCSV, ExportXLSX
- **DTOs**: Objetos de transferência de dados

### Infrastructure Layer (Camada de Infraestrutura)
Implementações concretas de persistência e serviços externos.

- **Repositories**: EventRepository (MongoDB), ProjectRepository (MongoDB)
- **File Storage**: CSVGenerator, XLSXGenerator, XLSXParser
- **Database**: Conexão MongoDB

### Presentation Layer (Camada de Apresentação)
Interface HTTP da aplicação.

- **Controllers**: EventController, ProjectController, ExportController
- **Routes**: Definição de rotas REST
- **Middlewares**: auth, validation, rate limiting, error handling
- **Validators**: Validação de schemas de entrada

## Instalação

```bash
npm install
cp .env.example .env
# Configure as variáveis de ambiente
npm run dev
```

## Scripts

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento com nodemon
- `npm test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo watch
- `npm run test:coverage` - Gera relatório de cobertura

## Variáveis de Ambiente

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/artia
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

Todos os endpoints requerem autenticação via JWT (exceto /health).

### Health Check
- `GET /health` - Verifica status da API

### Eventos
- `POST /api/v1/events` - Criar evento
- `GET /api/v1/events` - Listar eventos
- `GET /api/v1/events/:id` - Obter evento
- `PUT /api/v1/events/:id` - Atualizar evento
- `PATCH /api/v1/events/:id/move` - Mover evento
- `DELETE /api/v1/events/:id` - Deletar evento

### Projetos
- `GET /api/v1/projects` - Listar projetos
- `GET /api/v1/projects/search?q=termo` - Buscar projetos
- `GET /api/v1/projects/:id/activities` - Listar atividades
- `POST /api/v1/projects/import` - Importar XLSX

### Exportação
- `GET /api/v1/exports/csv` - Exportar CSV
- `GET /api/v1/exports/xlsx` - Exportar XLSX

## Segurança

- **JWT Authentication**: Tokens com expiração
- **Rate Limiting**: 100 req/min por IP
- **Input Validation**: Express Validator + Joi
- **Helmet.js**: Security headers
- **CORS**: Configurado para origens permitidas

## Testes

```bash
npm test
```

Estrutura de testes:
- `tests/unit/` - Testes unitários de domínio
- `tests/integration/` - Testes de integração
- `tests/e2e/` - Testes end-to-end
