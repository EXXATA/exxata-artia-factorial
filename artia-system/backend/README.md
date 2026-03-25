# Artia Backend

Backend do sistema Artia em Node.js/Express com arquitetura DDD, persistencia em Supabase/PostgreSQL e autenticacao corporativa Microsoft via Supabase Auth.

## Estrutura

### Domain layer
- entidades e regras de negocio
- value objects e erros de dominio
- contratos de repositorio

### Application layer
- use cases
- servicos de orquestracao

### Infrastructure layer
- repositorios Supabase
- integracoes com Factorial e Artia
- middlewares e adaptadores de autenticacao

### Presentation layer
- rotas REST
- controllers
- middlewares HTTP

## Fluxo oficial de autenticacao

1. O frontend inicia o login Microsoft no Supabase.
2. O frontend recebe a sessao em `/auth/callback`.
3. O token Supabase e enviado para `GET /api/v1/auth/me`.
4. O backend valida sessao, provider, dominio e tenant.
5. Se faltar provisionamento de negocio, responde com bloqueio estruturado.

Codigos de bloqueio suportados:

- `AUTH_PROVISIONING_PENDING`
- `USER_PROFILE_RECONCILIATION_REQUIRED`

O backend nao usa JWT proprio e nao suporta mais login/cadastro por senha como fluxo oficial.

## Instalacao

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

## Variaveis de ambiente

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MICROSOFT_ALLOWED_DOMAIN=exxata.com.br
MICROSOFT_ALLOWED_TENANT_ID=
CORS_ORIGIN=http://localhost:5173
FACTORIAL_API_KEY=your-factorial-api-key
FACTORIAL_API_URL=https://api.factorialhr.com
```

Variaveis `ARTIA_DB_*` permanecem disponiveis para integracoes operacionais com o banco legado do Artia.

## Scripts principais

- `npm start` inicia o servidor em producao
- `npm run dev` inicia o servidor em desenvolvimento
- `npm run test:microsoft-auth` executa os testes de autenticacao Microsoft
- `npm run reconcile:auth-users` executa a reconciliacao em dry-run
- `npm run reconcile:auth-users -- --apply` provisiona usuarios sem auth user

## Endpoints relevantes

- `GET /health`
- `GET /api/v1/auth/me`
- `GET /api/v1/events`
- `GET /api/v1/projects`
- `GET /api/v1/projects/search`
- `GET /api/v1/projects/:id/activities`

## Testes

```bash
npm run test:microsoft-auth
```

## Observacoes

- `factorialEmployeeId` e o criterio minimo de prontidao para liberar o app.
- `artiaUserId` e tratado como enriquecimento, nao como requisito de login.
- A migration de cleanup remove `password_hash` e ajusta o trigger de provisionamento por email.
