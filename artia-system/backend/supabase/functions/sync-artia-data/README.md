# Sync Artia Data - Edge Function

Edge Function do Supabase para sincronização diária de dados do Artia MySQL e Factorial HR.

## Funcionalidades

- **Sincronização de Usuários**: Unifica colaboradores do Factorial e Artia
- **Sincronização de Projetos**: Importa catálogo de projetos do Artia
- **Sincronização de Atividades**: Importa atividades vinculadas aos projetos
- **Cache de Horas**: Mantém cache de horas trabalhadas (Factorial e Artia)

## Execução

### Automática (Cron Job)
Executa diariamente às 05:00 AM via cron job configurado no Supabase.

### Manual (HTTP POST)

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/sync-artia-data \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "stages": ["users", "projects", "activities", "cache"],
    "initialSync": false
  }'
```

## Parâmetros

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `stages` | string[] | `["users", "projects", "activities", "cache"]` | Estágios a executar |
| `initialSync` | boolean | `false` | `true` = 90 dias de cache, `false` = 7 dias |
| `forceRefresh` | boolean | `false` | Forçar atualização ignorando cache |

## Estágios

### 1. Users
- Busca employees do Factorial via API
- Busca usuários do Artia MySQL via backend
- Faz matching por email
- Upsert em lotes de 50 registros

### 2. Projects
- Busca projetos ativos do Artia (status = 1, object_type = 'project')
- Upsert em lotes de 200 registros
- Atualiza sync state (TTL: 6 horas)

### 3. Activities
- Busca atividades ativas do Artia (status = 1)
- Valida referências a projetos existentes
- Gera `activity_id` único: `proj_{project_id}_act_{id}`
- Upsert em lotes de 500 registros

### 4. Cache
- **Factorial**: Busca shifts via API, agrega por dia, TTL: 15 min
- **Artia**: Busca lançamentos via backend, cache detalhado + agregado, TTL: 6 min
- Processa usuários individualmente com retry

## Variáveis de Ambiente

Configurar no Supabase Dashboard → Edge Functions → Secrets:

```bash
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FACTORIAL_API_KEY=eyJ...
BACKEND_API_URL=https://backend.example.com
BACKEND_API_KEY=secret-key
ARTIA_DB_HOST=artia.db.host
ARTIA_DB_PORT=3306
ARTIA_DB_USER=readonly_user
ARTIA_DB_PASSWORD=password
ARTIA_DB_NAME=artia
```

## Resposta

### Sucesso (200)
```json
{
  "success": true,
  "stages": {
    "users": {
      "success": true,
      "total": 309,
      "synced": 309,
      "failed": 0,
      "duration_ms": 2340
    },
    "projects": {
      "success": true,
      "total": 1796,
      "synced": 1796,
      "failed": 0,
      "duration_ms": 3120
    },
    "activities": {
      "success": true,
      "total": 64264,
      "synced": 64264,
      "failed": 0,
      "skipped": 0,
      "duration_ms": 6890
    },
    "cache": {
      "success": true,
      "factorial": { "synced": 309, "failed": 0 },
      "artia": { "synced": 309, "failed": 0 },
      "duration_ms": 18450
    }
  },
  "summary": {
    "totalDuration": 30800,
    "errors": [],
    "warnings": []
  },
  "timestamp": "2026-03-08T08:00:00.000Z"
}
```

### Sucesso Parcial (207)
```json
{
  "success": false,
  "stages": {
    "users": { "success": true, ... },
    "projects": { "success": false, "error": "Connection timeout" }
  },
  "summary": {
    "totalDuration": 15000,
    "errors": ["Projects sync failed: Connection timeout"],
    "warnings": ["⚠️ High error rate in sync-artia-data: 25.00% (1/4 failed)"]
  },
  "timestamp": "2026-03-08T08:00:00.000Z"
}
```

### Erro (500)
```json
{
  "success": false,
  "error": "Missing required environment variables",
  "timestamp": "2026-03-08T08:00:00.000Z"
}
```

## Monitoramento

### Logs
Acessar via Supabase Dashboard → Edge Functions → Logs

### Métricas
- Taxa de sucesso por estágio
- Duração total e por estágio
- Taxa de erro (alerta se > 10%)
- Registros processados vs falhados

### Alertas
- Taxa de erro > 10%: Warning nos logs
- Tempo de execução > 10 min: Warning
- Falha completa: Error 500

## Performance

### Estimativas (População Inicial)
| Estágio | Registros | Tempo Estimado |
|---------|-----------|----------------|
| Users | 309 | ~1-2 min |
| Projects | 1.796 | ~2-3 min |
| Activities | 64.264 | ~5-7 min |
| Cache Factorial | 309 × 90 dias | ~15-20 min |
| Cache Artia | 309 × 90 dias | ~3-5 min |
| **TOTAL** | ~66.678 | **~25-35 min** |

### Estimativas (Sync Diária)
| Estágio | Operação | Tempo Estimado |
|---------|----------|----------------|
| Users | Incremental | ~30s |
| Projects | Incremental | ~30s |
| Activities | Incremental | ~1-2 min |
| Cache Factorial | 7 dias | ~2-3 min |
| Cache Artia | 7 dias | ~1 min |
| **TOTAL** | - | **~5-7 min** |

## Troubleshooting

### Timeout (> 5 min)
- Dividir em múltiplas execuções
- Reduzir `daysToSync` no cache
- Aumentar `batchSize` (cuidado com memória)

### Rate Limit Factorial
- Reduzir `maxParallel` no cache
- Adicionar delay entre requisições
- Verificar quota da API

### Erros de Foreign Key
- Executar estágios na ordem: users → projects → activities → cache
- Verificar se projetos foram sincronizados antes das atividades

### Backend API não responde
- Verificar `BACKEND_API_URL` e `BACKEND_API_KEY`
- Testar endpoint manualmente
- Verificar logs do backend

## Deploy

```bash
# Deploy da função
supabase functions deploy sync-artia-data

# Configurar secrets
supabase secrets set FACTORIAL_API_KEY=eyJ...
supabase secrets set BACKEND_API_URL=https://...
# ... (demais secrets)

# Testar manualmente
supabase functions invoke sync-artia-data \
  --data '{"stages":["users"],"initialSync":false}'
```

## Estrutura de Arquivos

```
sync-artia-data/
├── index.ts                 # Handler principal
├── sync-users.ts            # Sincronização de usuários
├── sync-projects.ts         # Sincronização de projetos
├── sync-activities.ts       # Sincronização de atividades
├── sync-hours-cache.ts      # Sincronização de cache de horas
├── utils/
│   ├── batch-processor.ts   # Processamento em lotes
│   ├── logger.ts            # Sistema de logs
│   └── error-handler.ts     # Tratamento de erros
└── README.md                # Esta documentação
```
