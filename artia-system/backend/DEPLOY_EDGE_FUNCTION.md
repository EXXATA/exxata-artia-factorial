# Deploy da Edge Function sync-artia-data

Guia passo a passo para fazer deploy da Edge Function de sincronização no Supabase.

## Pré-requisitos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**
   ```bash
   supabase login
   ```

3. **Link com o projeto**
   ```bash
   supabase link --project-ref cjjknpbklfqdjsaxaqqc
   ```

## Passo 1: Configurar Variáveis de Ambiente

No Supabase Dashboard → Settings → Edge Functions → Secrets, adicionar:

```bash
# Supabase (já configurado automaticamente)
SUPABASE_URL=https://cjjknpbklfqdjsaxaqqc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>

# Factorial API
FACTORIAL_API_KEY=eyJraWQiOiJmYWN0b3JpYWwtaWQiLCJhbGciOiJFUzI1NiJ9...

# Backend API (para acessar Artia MySQL)
BACKEND_API_URL=https://seu-backend.vercel.app
BACKEND_API_KEY=<secret-key-do-backend>

# Artia MySQL (caso use conexão direta - não recomendado em Edge Function)
ARTIA_DB_HOST=exxata.db.artia.com
ARTIA_DB_PORT=3306
ARTIA_DB_USER=cliente-9115
ARTIA_DB_PASSWORD=<password>
ARTIA_DB_NAME=artia
```

### Via CLI (alternativa):

```bash
supabase secrets set FACTORIAL_API_KEY=eyJ...
supabase secrets set BACKEND_API_URL=https://...
supabase secrets set BACKEND_API_KEY=secret-key
```

## Passo 2: Deploy da Edge Function

```bash
cd c:\Users\andre\Desktop\artia-main\artia-main\artia-system\backend

# Deploy
supabase functions deploy sync-artia-data --project-ref cjjknpbklfqdjsaxaqqc
```

## Passo 3: Aplicar Migration do Cron Job

```bash
# Aplicar migration que configura o cron job
supabase db push --project-ref cjjknpbklfqdjsaxaqqc
```

Ou via Dashboard:
1. Ir em Database → SQL Editor
2. Copiar conteúdo de `supabase/migrations/20260308000000_configure_sync_cron.sql`
3. Executar

## Passo 4: Testar Manualmente

### Teste Simples (apenas usuários)

```bash
supabase functions invoke sync-artia-data \
  --project-ref cjjknpbklfqdjsaxaqqc \
  --data '{
    "stages": ["users"],
    "initialSync": false
  }'
```

### Teste Completo (todos os estágios)

```bash
supabase functions invoke sync-artia-data \
  --project-ref cjjknpbklfqdjsaxaqqc \
  --data '{
    "stages": ["users", "projects", "activities", "cache"],
    "initialSync": false
  }'
```

### População Inicial (90 dias de cache)

```bash
curl -X POST https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/sync-artia-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "stages": ["users", "projects", "activities", "cache"],
    "initialSync": true
  }'
```

## Passo 5: Verificar Logs

### Via CLI
```bash
supabase functions logs sync-artia-data --project-ref cjjknpbklfqdjsaxaqqc
```

### Via Dashboard
1. Edge Functions → sync-artia-data → Logs
2. Verificar execuções e erros

## Passo 6: Verificar Cron Job

### Via SQL Editor

```sql
-- Listar jobs agendados
SELECT * FROM cron.job WHERE jobname = 'sync-artia-daily';

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-artia-daily')
ORDER BY start_time DESC
LIMIT 10;

-- Ver log de execuções customizado
SELECT * FROM sync_execution_log
ORDER BY started_at DESC
LIMIT 10;
```

### Executar Manualmente o Cron Job

```sql
SELECT invoke_sync_artia_data();
```

## Passo 7: Monitoramento

### Configurar Alertas (Opcional)

No Supabase Dashboard → Settings → Alerts, configurar:

1. **Alert de Erro**: Taxa de erro > 10%
2. **Alert de Timeout**: Execução > 10 minutos
3. **Alert de Falha**: Função retorna status 500

### Métricas para Monitorar

- Taxa de sucesso por estágio
- Duração total e por estágio
- Registros sincronizados vs falhados
- Frequência de execução do cron

## Troubleshooting

### Erro: "Missing required environment variables"

**Solução**: Verificar se todas as secrets foram configuradas
```bash
supabase secrets list --project-ref cjjknpbklfqdjsaxaqqc
```

### Erro: "Backend API not responding"

**Solução**: 
1. Verificar se `BACKEND_API_URL` está correto
2. Testar endpoint manualmente
3. Verificar se `BACKEND_API_KEY` está válido

### Erro: "Factorial API rate limit"

**Solução**:
1. Reduzir `maxParallel` no código
2. Executar sync em horários de baixo uso
3. Verificar quota da API Factorial

### Cron Job não executa

**Solução**:
1. Verificar se pg_cron está habilitado:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
2. Verificar se o job está ativo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'sync-artia-daily';
   ```
3. Verificar logs de erro:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE status = 'failed'
   ORDER BY start_time DESC;
   ```

### Timeout (> 5 minutos)

**Solução**:
1. Executar população inicial em etapas separadas
2. Reduzir `daysToSync` no cache
3. Aumentar timeout da Edge Function (se possível)

## Manutenção

### Atualizar Edge Function

```bash
# Fazer alterações no código
# Depois fazer deploy novamente
supabase functions deploy sync-artia-data --project-ref cjjknpbklfqdjsaxaqqc
```

### Pausar Cron Job

```sql
SELECT cron.unschedule('sync-artia-daily');
```

### Reativar Cron Job

```sql
SELECT cron.schedule(
  'sync-artia-daily',
  '0 8 * * *',
  $$SELECT invoke_sync_artia_data();$$
);
```

### Alterar Horário do Cron

```sql
-- Remover job existente
SELECT cron.unschedule('sync-artia-daily');

-- Criar com novo horário (exemplo: 06:00 AM UTC-3 = 09:00 UTC)
SELECT cron.schedule(
  'sync-artia-daily',
  '0 9 * * *',
  $$SELECT invoke_sync_artia_data();$$
);
```

## Checklist de Deploy

- [ ] Supabase CLI instalado e configurado
- [ ] Projeto linkado (`supabase link`)
- [ ] Todas as secrets configuradas
- [ ] Edge Function deployed
- [ ] Migration do cron job aplicada
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados (sem erros críticos)
- [ ] Cron job agendado e ativo
- [ ] População inicial executada (se necessário)
- [ ] Monitoramento configurado

## Próximos Passos

1. ✅ Executar população inicial manualmente
2. ✅ Monitorar primeira execução do cron (às 05:00 AM)
3. ✅ Ajustar batch sizes se necessário
4. ✅ Configurar alertas no Supabase
5. ✅ Documentar processo para equipe
