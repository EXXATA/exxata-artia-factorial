-- População Direta via SQL
-- Execute este script no Supabase SQL Editor para popular os dados

-- Nota: Este é um script de referência. 
-- A população real deve ser feita via Edge Functions que já estão configuradas.

-- Para executar a população completa, use:
-- 1. Via SQL: SELECT invoke_sync_artia_data();
-- 2. Via Edge Function: POST https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/populate-all

-- Verificar dados atuais:
SELECT 
  'projects' as tabela, 
  COUNT(*) as total,
  COUNT(CASE WHEN source = 'artia_mysql' THEN 1 END) as artia_mysql,
  MAX(last_synced_at) as ultima_sync
FROM projects
UNION ALL
SELECT 
  'activities' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN source = 'artia_mysql' THEN 1 END) as artia_mysql,
  MAX(last_synced_at) as ultima_sync
FROM activities
UNION ALL
SELECT 
  'users' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN factorial_employee_id IS NOT NULL THEN 1 END) as factorial,
  MAX(updated_at) as ultima_sync
FROM users;
