# Teste da Edge Function - Status Atual

## ✅ Deploy Concluído

**Edge Function**: `sync-artia-data`  
**Projeto**: `cjjknpbklfqdjsaxaqqc`  
**URL**: https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/sync-artia-data

## ✅ Secrets Configurados

- `FACTORIAL_API_KEY` ✅
- `BACKEND_API_URL` = http://localhost:3000 ✅
- `BACKEND_API_KEY` = dev-test-key-12345 ✅
- `SUPABASE_ANON_KEY` (automático) ✅
- `SUPABASE_URL` (automático) ✅
- `SUPABASE_SERVICE_ROLE_KEY` (automático) ✅

## ⚠️ Problema Atual: Erro 401 (Não Autorizado)

A Edge Function está retornando erro 401 ao tentar invocar via curl/PowerShell.

### Possíveis Causas

1. **Validação de Token Muito Restrita**: A função compara o header Authorization exatamente com o valor esperado
2. **Espaços ou Formatação**: Pode haver diferença na formatação do header
3. **Token Expirado**: Improvável, mas possível

### Soluções

#### Opção 1: Testar via Dashboard do Supabase (RECOMENDADO)

1. Acessar: https://supabase.com/dashboard/project/cjjknpbklfqdjsaxaqqc/functions
2. Clicar em `sync-artia-data`
3. Ir em "Invoke"
4. Usar o payload:
```json
{
  "stages": ["projects"],
  "initialSync": false
}
```

#### Opção 2: Ajustar Validação Temporariamente

Comentar a validação de auth no `index.ts` (linhas 50-60) para teste:

```typescript
// 2. Validar autenticação (COMENTADO PARA TESTE)
// const authHeader = req.headers.get('Authorization');
// const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;
// 
// if (authHeader !== expectedAuth) {
//   logger.warn('Unauthorized access attempt');
//   return new Response(
//     JSON.stringify({ error: 'Unauthorized' }),
//     { status: 401, headers: { 'Content-Type': 'application/json' } }
//   );
// }
```

Depois fazer re-deploy:
```bash
npx supabase@latest functions deploy sync-artia-data --project-ref cjjknpbklfqdjsaxaqqc --no-verify-jwt
```

#### Opção 3: Usar Service Role Key

Tentar com o service role key em vez do anon key:

```powershell
$headers = @{ 
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamtucGJrbGZxZGpzYXhhcXFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgyNDkyMSwiZXhwIjoyMDg4NDAwOTIxfQ.8tyoI-Mcp3BnhVbuRCxtfXwD1AWuuhyRYMDPgMwERTM"
  "Content-Type" = "application/json" 
}
$body = '{"stages":["projects"],"initialSync":false}'
Invoke-RestMethod -Uri "https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/sync-artia-data" -Method Post -Headers $headers -Body $body
```

## 🔍 Debug

### Ver Logs da Função

Via Dashboard:
1. https://supabase.com/dashboard/project/cjjknpbklfqdjsaxaqqc/logs/edge-functions
2. Filtrar por `sync-artia-data`

### Verificar Secrets

```bash
npx supabase@latest secrets list --project-ref cjjknpbklfqdjsaxaqqc
```

## ⏳ Próximos Passos Após Resolver Auth

1. **Testar Sincronização de Projetos** (menor volume)
2. **Verificar Logs** para ver se backend está sendo chamado
3. **Implementar Endpoints do Backend** se necessário:
   - `GET /api/v1/artia-db/projects`
   - `GET /api/v1/artia-db/activities`
   - `GET /api/v1/artia-db/users`
4. **População Completa** com todos os estágios
5. **Verificar Dados** no Supabase

## 📝 Notas

- Backend Node.js está rodando (múltiplos processos detectados)
- Edge Function foi deployed 2 vezes com sucesso
- Todos os secrets estão configurados
- Cron job está ativo e agendado para 05:00 AM

---

**Recomendação**: Testar via Dashboard do Supabase primeiro para validar que a função está funcionando, depois resolver o problema de autenticação via API.
