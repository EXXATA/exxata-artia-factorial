# Migração para Supabase

Este projeto foi migrado de MongoDB para Supabase (PostgreSQL).

## Configuração

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie as credenciais:
   - `SUPABASE_URL`: URL do projeto
   - `SUPABASE_ANON_KEY`: Chave pública (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (opcional, para operações admin)

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

### 3. Executar migrations

As migrations SQL estão em `supabase/migrations/`. Execute-as na ordem:

1. `20260306000001_create_projects_table.sql`
2. `20260306000002_create_activities_table.sql`
3. `20260306000003_create_events_table.sql`

**Opção 1: Via Supabase Dashboard**
- Acesse SQL Editor no dashboard
- Cole e execute cada migration

**Opção 2: Via Supabase CLI**
```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref seu-projeto-ref

# Executar migrations
supabase db push
```

### 4. Instalar dependências

```bash
npm install
```

### 5. Iniciar servidor

```bash
npm run dev
```

## Estrutura do Banco

### Tabela `projects`
- `id` (UUID, PK)
- `project_id` (TEXT, UNIQUE)
- `number` (TEXT, UNIQUE)
- `name` (TEXT)
- `created_at`, `updated_at`

### Tabela `activities`
- `id` (UUID, PK)
- `activity_id` (TEXT, UNIQUE)
- `project_id` (TEXT, FK → projects)
- `label` (TEXT)
- `artia_id` (TEXT, nullable)
- `created_at`, `updated_at`

### Tabela `events`
- `id` (UUID, PK)
- `event_id` (TEXT, UNIQUE)
- `user_id` (TEXT)
- `start_time`, `end_time` (TIMESTAMPTZ)
- `day` (DATE)
- `project` (TEXT)
- `activity_id`, `activity_label` (TEXT)
- `notes` (TEXT)
- `artia_launched` (BOOLEAN)
- `workplace` (TEXT, nullable)
- `created_at`, `updated_at`

## Row Level Security (RLS)

As tabelas têm RLS habilitado:

- **projects** e **activities**: Todos os usuários autenticados podem ler/escrever
- **events**: Usuários só podem acessar seus próprios eventos (`user_id = auth.uid()`)

## Autenticação

O sistema usa JWT próprio no backend. O Supabase é usado apenas como banco de dados PostgreSQL.

Para integrar autenticação Supabase (opcional):
1. Habilite providers no dashboard Supabase
2. Use `supabase.auth.signIn()` no frontend
3. Passe o token JWT do Supabase nas requisições
4. Valide com `getSupabaseClient(accessToken)` no backend

## Diferenças vs MongoDB

| Aspecto | MongoDB | Supabase |
|---------|---------|----------|
| Tipo | NoSQL (documentos) | SQL (relacional) |
| Schema | Flexível | Rígido (migrations) |
| Relacionamentos | Embedded/referências | Foreign keys |
| Queries | Agregações | SQL/PostgREST |
| RLS | Manual | Nativo (políticas) |
| Conexão | Stateful | Stateless (HTTP) |

## Vantagens do Supabase

- ✅ RLS nativo para segurança multi-tenant
- ✅ Sem necessidade de gerenciar conexões
- ✅ Ideal para serverless (Vercel)
- ✅ Dashboard visual para dados
- ✅ Backup automático
- ✅ Realtime subscriptions (opcional)
- ✅ Storage de arquivos integrado
- ✅ Edge Functions (opcional)

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se `.env` tem `SUPABASE_URL` e `SUPABASE_ANON_KEY`

### Erro: "relation does not exist"
- Execute as migrations SQL no Supabase

### Erro: "new row violates row-level security policy"
- Verifique se o usuário está autenticado
- Confirme que `user_id` corresponde ao `auth.uid()`

### Performance lenta em queries
- Verifique se os índices foram criados (migrations)
- Use `.explain()` no SQL Editor para analisar queries
