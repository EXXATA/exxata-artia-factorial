# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-03-06

### 🎉 Lançamento Inicial - Refatoração Completa

#### Adicionado

**Backend - Arquitetura DDD**
- ✅ Domain Layer com Entidades (Event, Project, Activity, User)
- ✅ Value Objects (TimeRange, DateRange, Email)
- ✅ Serviços de Domínio (EventValidation, TimeCalculation, IdLookup)
- ✅ Application Layer com Use Cases
- ✅ Infrastructure Layer com MongoDB
- ✅ Presentation Layer com REST API
- ✅ Autenticação JWT completa
- ✅ Rate Limiting (100 req/min)
- ✅ Validação de entrada com Joi
- ✅ Middlewares de segurança (Helmet, CORS)
- ✅ Exportação CSV e XLSX
- ✅ Importação de base de IDs via XLSX
- ✅ Tratamento de erros centralizado

**Frontend - React Moderno**
- ✅ React 18 com Vite
- ✅ TailwindCSS para estilização
- ✅ Zustand para state management
- ✅ React Query para cache de API
- ✅ React Router para navegação
- ✅ Tema dark/light
- ✅ 5 Views principais: Calendário, Gantt, Tabela, Gráficos, Diretório
- ✅ Componentes reutilizáveis (Button, Modal, Input)
- ✅ Hooks customizados (useEvents, useProjects)
- ✅ Serviços de API organizados
- ✅ Notificações toast

**Infraestrutura**
- ✅ Docker Compose para orquestração
- ✅ MongoDB containerizado
- ✅ Nginx como reverse proxy
- ✅ Dockerfiles otimizados
- ✅ Scripts de setup e migração

**Documentação**
- ✅ README principal completo
- ✅ README backend com detalhes DDD
- ✅ README frontend com estrutura React
- ✅ Guia de migração detalhado
- ✅ Quick Start para início rápido
- ✅ Changelog

#### Mudado

**Do Sistema Antigo para o Novo**
- 🔄 Arquivo monolítico (257KB) → Arquitetura modular DDD
- 🔄 IndexedDB → MongoDB
- 🔄 LocalStorage → API REST
- 🔄 Sem autenticação → JWT com refresh tokens
- 🔄 Single-user → Multi-user
- 🔄 Front e back misturados → Separação completa

#### Segurança

- 🔐 Autenticação JWT com tokens de acesso e refresh
- 🔐 Rate limiting por IP e por usuário
- 🔐 Validação de entrada em todas as rotas
- 🔐 Helmet.js para headers de segurança
- 🔐 CORS configurado
- 🔐 Senhas hasheadas com bcrypt
- 🔐 Proteção contra SQL injection (usando ODM)
- 🔐 Sanitização de dados

#### Performance

- ⚡ Lazy loading de componentes React
- ⚡ Cache de queries com React Query
- ⚡ Compressão gzip/brotli
- ⚡ Índices MongoDB otimizados
- ⚡ Build otimizado com Vite

### Funcionalidades Migradas

| Funcionalidade | Status | Notas |
|----------------|--------|-------|
| CRUD de Eventos | ✅ | Com validação de sobreposição |
| Calendário Semanal | ✅ | Navegação entre semanas |
| View Gantt | ✅ | Estrutura pronta |
| View Tabela | ✅ | Estrutura pronta |
| View Gráficos | ✅ | Estrutura pronta |
| View Diretório | ✅ | Busca de projetos/atividades |
| Export CSV | ✅ | Com encoding UTF-8 BOM |
| Export XLSX | ✅ | Com metadados |
| Import XLSX | ✅ | Base de IDs |
| Tema Dark/Light | ✅ | Persistido no localStorage |
| Auto-fill IDs | ✅ | Serviço de lookup |

### Novas Funcionalidades

- 🆕 Sistema de autenticação completo
- 🆕 API REST documentada
- 🆕 Suporte multi-usuário
- 🆕 Rate limiting
- 🆕 Logs estruturados
- 🆕 Health checks
- 🆕 Docker support
- 🆕 Migrations system

### Próximas Versões (Roadmap)

#### [1.1.0] - Planejado
- [ ] Drag & drop no calendário
- [ ] WebSocket para presença online
- [ ] Notificações em tempo real
- [ ] Modo offline com sincronização
- [ ] Testes E2E com Playwright
- [ ] Documentação Swagger/OpenAPI

#### [1.2.0] - Planejado
- [ ] Relatórios avançados
- [ ] Exportação PDF
- [ ] Integração com Artia API (se disponível)
- [ ] Dashboard analytics
- [ ] Filtros avançados
- [ ] Busca global

#### [2.0.0] - Futuro
- [ ] Mobile app (React Native)
- [ ] Integração com calendários (Google, Outlook)
- [ ] Aprovação de horas
- [ ] Gestão de equipes
- [ ] Permissões granulares
- [ ] Auditoria completa

---

## Formato

Este changelog segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

### Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Mudado** para mudanças em funcionalidades existentes
- **Descontinuado** para funcionalidades que serão removidas
- **Removido** para funcionalidades removidas
- **Corrigido** para correções de bugs
- **Segurança** para vulnerabilidades corrigidas
