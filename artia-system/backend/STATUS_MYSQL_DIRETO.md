# Status - Conexão MySQL Direta

**Data**: 2026-03-08 17:27  
**Abordagem**: Acesso direto ao Artia MySQL via Edge Function

## ✅ Progresso

### 1. Credenciais MySQL Configuradas
- ✅ `ARTIA_DB_HOST` = exxata.db.artia.com
- ✅ `ARTIA_DB_PORT` = 3306
- ✅ `ARTIA_DB_USER` = cliente-9115
- ✅ `ARTIA_DB_PASSWORD` = configurado
- ✅ `ARTIA_DB_NAME` = artia

### 2. Módulo MySQL Criado
- ✅ `utils/mysql-client.ts` - Cliente MySQL para Deno
- ✅ Usa biblioteca `https://deno.land/x/mysql@v2.12.1`

### 3. Módulos Modificados
- ✅ `sync-users.ts` - Busca direto do MySQL
- ✅ `sync-projects.ts` - Busca direto do MySQL
- ✅ `sync-activities.ts` - Busca direto do MySQL

### 4. Deploy Realizado
- ✅ Edge Function `sync-artia-data` (version 12)
- ✅ Edge Function `test-mysql` (para diagnóstico)

### 5. Teste de Conexão MySQL
- ✅ **Conexão bem-sucedida!**
- ✅ **384 projetos** encontrados no Artia MySQL
- ✅ Query executada com sucesso

## ⚠️ Problema Atual

### Sincronização Não Está Populando Dados

**Sintomas**:
- Usuários: ✅ 55 sincronizados (Factorial API)
- Projetos: ❌ 0 sincronizados (MySQL deveria ter 384)
- Atividades: ❌ 0 sincronizados

**Logs**:
- Última execução: Status 200 (sucesso)
- Duração: 25.7 segundos
- Sem erros aparentes nos logs

**Hipóteses**:
1. Query SQL pode estar retornando dados mas não no formato esperado
2. Mapeamento de campos pode estar incorreto
3. Erro silencioso no processamento de lotes
4. Problema com a estrutura de dados retornada pelo MySQL client

## 🔍 Diagnóstico Necessário

### Verificar Estrutura de Dados

A query no `test-mysql` retorna:
```json
{
  "result": [{"total": 384}]
}
```

Mas a query em `sync-projects.ts` pode estar retornando estrutura diferente.

### Query Atual em sync-projects.ts
```sql
SELECT 
  id,
  project_number as number,
  name,
  status as active,
  created_at as createdAt
FROM organization_9115_projects_v2 
WHERE status = 1 AND object_type = 'project'
ORDER BY name
```

### Possíveis Problemas

1. **Campo `object_type`**: Pode não existir ou ter valor diferente
2. **Alias de colunas**: MySQL pode não suportar alguns alias
3. **Tipo de dados**: Conversão pode estar falhando
4. **Processamento em lotes**: Pode estar falhando silenciosamente

## 📋 Próximas Ações

### Opção 1: Adicionar Logs Detalhados

Modificar `sync-projects.ts` para logar:
- Quantidade de registros retornados do MySQL
- Primeiros 5 registros para debug
- Erros durante processamento de lotes

### Opção 2: Simplificar Query

Testar com query mais simples:
```sql
SELECT id, project_number, name 
FROM organization_9115_projects_v2 
WHERE status = 1
LIMIT 10
```

### Opção 3: Testar Diretamente via test-mysql

Modificar `test-mysql` para executar a mesma query de projetos e ver estrutura retornada.

## 📊 Dados Atuais no Supabase

| Tabela | Total | Fonte | Última Sync |
|--------|-------|-------|-------------|
| users | 55 | Factorial | 20:27:05 |
| projects | 0 | - | - |
| activities | 0 | - | - |

## 🎯 Objetivo

Sincronizar os **384 projetos** do Artia MySQL para o Supabase.

---

**Próximo Passo**: Modificar `test-mysql` para executar query completa de projetos e verificar estrutura de dados retornada.
