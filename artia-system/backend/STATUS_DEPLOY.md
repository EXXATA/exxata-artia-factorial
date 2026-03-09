# Status do Deploy - Sincronização Artia

**Data**: 2026-03-08  
**Status**: ✅ Migration aplicada com sucesso

## ✅ Alterações Aplicadas no Supabase

### 1. Migration `configure_sync_cron` Aplicada

**ID da Migration**: `20260308200812`  
**Nome**: `configure_sync_cron`

### 2. Extensões Habilitadas

- ✅ `pg_cron` - Para agendamento de jobs
- ✅ `pg_net` - Para requisições HTTP

### 3. Função Criada

**Nome**: `invoke_sync_artia_data()`  
**Tipo**: PLPGSQL, SECURITY DEFINER  
**Descrição**: Invoca a Edge Function sync-artia-data para sincronização diária

### 4. Cron Job Configurado

**Detalhes do Job**:
```
Job ID: 1
Nome: sync-artia-daily
Schedule: 0 8 * * * (08:00 UTC = 05:00 AM UTC-3)
Comando: SELECT invoke_sync_artia_data();
Status: ATIVO ✅
```

### 5. Tabela de Log Criada

**Nome**: `sync_execution_log`

**Colunas**:
- `id` (UUID, PK)
- `job_name` (TEXT)
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `status` (TEXT)
- `response` (JSONB)
- `error_message` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Índice**: `idx_sync_execution_log_started_at`  
**RLS**: Habilitado  
**Policy**: Service role tem acesso total

## 📋 Próximos Passos

### 1. Deploy da Edge Function (PENDENTE)

A Edge Function `sync-artia-data` ainda precisa ser deployed no Supabase:

```bash
cd c:\Users\andre\Desktop\artia-main\artia-main\artia-system\backend
supabase functions deploy sync-artia-data --project-ref cjjknpbklfqdjsaxaqqc
```

### 2. Configurar Variáveis de Ambiente (PENDENTE)

No Supabase Dashboard → Edge Functions → Secrets:

```bash
FACTORIAL_API_KEY=eyJraWQiOiJmYWN0b3JpYWwtaWQi...
BACKEND_API_URL=https://seu-backend.vercel.app
BACKEND_API_KEY=<secret-key>
```

### 3. Implementar Endpoints do Backend (PENDENTE)

A Edge Function depende destes endpoints no backend Node.js:

- `GET /api/v1/artia-db/users`
- `GET /api/v1/artia-db/projects`
- `GET /api/v1/artia-db/activities`
- `GET /api/v1/artia-hours/entries?userId={id}&startDate={date}&endDate={date}`

### 4. População Inicial (PENDENTE)

Após deploy da Edge Function, executar população inicial:

```bash
curl -X POST https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/sync-artia-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "stages": ["users", "projects", "activities", "cache"],
    "initialSync": true
  }'
```

## 🔍 Verificação

### Verificar Cron Job

```sql
SELECT * FROM cron.job WHERE jobname = 'sync-artia-daily';
```

**Resultado Atual**:
- ✅ Job criado e ativo
- ✅ Schedule: 0 8 * * * (diariamente às 05:00 AM UTC-3)

### Verificar Histórico de Execuções

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;
```

### Verificar Logs Customizados

```sql
SELECT * FROM sync_execution_log
ORDER BY started_at DESC
LIMIT 10;
```

## ⚠️ Observações Importantes

### Execução Automática

O cron job está **ATIVO** e executará automaticamente:
- **Primeira execução**: Amanhã às 05:00 AM (UTC-3)
- **Frequência**: Diariamente às 05:00 AM

### Pré-requisitos para Funcionamento

⚠️ **IMPORTANTE**: O cron job só funcionará corretamente quando:

1. ✅ Edge Function `sync-artia-data` estiver deployed
2. ⏳ Variáveis de ambiente estiverem configuradas
3. ⏳ Endpoints do backend estiverem implementados

Até lá, o cron job executará mas falhará ao tentar invocar a Edge Function.

### Testar Manualmente

Após deploy da Edge Function, você pode testar manualmente:

```sql
SELECT invoke_sync_artia_data();
```

## 📊 Estrutura Completa Implementada

```
Supabase (cjjknpbklfqdjsaxaqqc)
├── Extensions
│   ├── pg_cron ✅
│   └── pg_net ✅
├── Functions
│   └── invoke_sync_artia_data() ✅
├── Cron Jobs
│   └── sync-artia-daily (0 8 * * *) ✅
├── Tables
│   └── sync_execution_log ✅
└── Edge Functions (a deployar)
    └── sync-artia-data ⏳
        ├── index.ts
        ├── sync-users.ts
        ├── sync-projects.ts
        ├── sync-activities.ts
        ├── sync-hours-cache.ts
        └── utils/
```

## 🎯 Checklist de Deploy

- [x] Migration aplicada no Supabase
- [x] Extensões pg_cron e pg_net habilitadas
- [x] Função invoke_sync_artia_data() criada
- [x] Cron job sync-artia-daily agendado
- [x] Tabela sync_execution_log criada
- [ ] Edge Function deployed
- [ ] Variáveis de ambiente configuradas
- [ ] Endpoints do backend implementados
- [ ] População inicial executada
- [ ] Primeira sincronização monitorada

---

**Próxima Ação Recomendada**: Deploy da Edge Function no Supabase
