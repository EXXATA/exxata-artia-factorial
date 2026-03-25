# Sistema Artia

Sistema de apontamento de horas com backend em Node.js/Express, frontend em React/Vite, banco PostgreSQL no Supabase e autenticacao corporativa via Microsoft.

## Arquitetura

### Backend
- Domain layer com entidades, regras de negocio e contratos
- Application layer com use cases
- Infrastructure layer com repositorios Supabase e integracoes externas
- Presentation layer com rotas, controllers e middlewares HTTP

### Frontend
- React 18 + Vite
- React Router para rotas
- React Query para cache de API
- TailwindCSS para interface

### Dados e autenticacao
- Supabase PostgreSQL para persistencia
- Supabase Auth com provider Microsoft/Azure
- Politica corporativa no backend para dominio e tenant

## Fluxo oficial de acesso

1. O usuario acessa `/login` e autentica com Microsoft.
2. O frontend conclui a sessao no Supabase em `/auth/callback`.
3. O app chama `GET /api/v1/auth/me` com o bearer token do Supabase.
4. O backend valida a sessao, o provider Microsoft e a politica corporativa.
5. Se o perfil local estiver pronto, o usuario entra nas rotas privadas.
6. Se faltar provisionamento de negocio, o usuario vai para `/access-pending`.

Os fluxos legados de login/cadastro por senha e login via Artia nao fazem mais parte do caminho oficial do sistema.

## Provisionamento

- O trigger do Supabase cria ou atualiza o perfil tecnico em `public.users` no primeiro login Microsoft.
- O acesso funcional exige `factorialEmployeeId`.
- Quando faltar esse vinculo, a API responde `403 AUTH_PROVISIONING_PENDING` e o frontend mostra a tela de pendencia.
- Quando houver conflito entre o `auth.user.id` e um perfil local encontrado por email, a API responde `403 USER_PROFILE_RECONCILIATION_REQUIRED`.

Para reconciliar a base existente:

```bash
cd backend
npm run reconcile:auth-users
npm run reconcile:auth-users -- --apply
```

O modo padrao e `dry-run`. O modo `--apply` exige `SUPABASE_SERVICE_ROLE_KEY`.

## Configuracao local

### Backend

```bash
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Variaveis importantes em `backend/.env`:

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

As configuracoes `ARTIA_DB_*` continuam disponiveis para integracoes operacionais com o banco legado do Artia.

### Frontend

```bash
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Variaveis importantes em `frontend/.env`:

```env
VITE_API_URL=/api/v1
VITE_API_PROXY_TARGET=http://localhost:3100
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Migrations

As migrations do banco ficam em `backend/supabase/migrations`.

Para aplicar localmente:

```bash
cd backend
supabase db push
```

## Validacao

### Backend

```bash
cd backend
npm run test:microsoft-auth
```

### Frontend

```bash
cd frontend
npm run build
```

## Estado atual

- Autenticacao oficial: Microsoft + Supabase
- Tela publica de pendencia: `/access-pending`
- Rotas privadas liberadas apenas para usuarios `authenticated`
- Provisionamento de negocio controlado pelo backend
