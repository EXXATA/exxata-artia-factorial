-- Migration: Configurar cron job para sincronização diária
-- Data: 2026-03-08
-- Descrição: Configura execução automática da Edge Function sync-artia-data às 05:00 AM

-- Habilitar extensão pg_cron se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão pg_net para fazer requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver (para permitir re-execução da migration)
SELECT cron.unschedule('sync-artia-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-artia-daily'
);

-- Criar função helper para invocar a Edge Function
CREATE OR REPLACE FUNCTION invoke_sync_artia_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  response_id BIGINT;
BEGIN
  -- Obter URL do Supabase (ajustar conforme seu projeto)
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Se não configurado via settings, usar valores padrão
  IF supabase_url IS NULL THEN
    supabase_url := 'https://cjjknpbklfqdjsaxaqqc.supabase.co';
  END IF;
  
  IF anon_key IS NULL THEN
    -- IMPORTANTE: Substituir pelo anon key real do projeto
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamtucGJrbGZxZGpzYXhhcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjQ5MjEsImV4cCI6MjA4ODQwMDkyMX0.sTtPQVydInD5FekjxXExbBZJ-xG9-ZeHoezIrJz7cvA';
  END IF;
  
  -- Fazer requisição HTTP POST para a Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/sync-artia-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || anon_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'stages', jsonb_build_array('users', 'projects', 'activities', 'cache'),
      'initialSync', false,
      'forceRefresh', false
    )
  ) INTO response_id;
  
  -- Log da execução
  RAISE NOTICE 'Sync job triggered with response_id: %', response_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log de erro mas não falha a execução
    RAISE WARNING 'Error invoking sync-artia-data: %', SQLERRM;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION invoke_sync_artia_data() IS 'Invoca a Edge Function sync-artia-data para sincronização diária de dados do Artia';

-- Agendar execução diária às 05:00 AM (horário UTC-3 = 08:00 UTC)
-- Nota: pg_cron usa horário UTC, então 08:00 UTC = 05:00 AM UTC-3
SELECT cron.schedule(
  'sync-artia-daily',           -- Nome do job
  '0 8 * * *',                  -- Cron expression: 08:00 UTC (05:00 AM UTC-3)
  $$SELECT invoke_sync_artia_data();$$
);

-- Comentário no job
UPDATE cron.job 
SET comment = 'Sincronização diária de dados do Artia MySQL e Factorial às 05:00 AM (UTC-3)'
WHERE jobname = 'sync-artia-daily';

-- Criar tabela para log de execuções (opcional, para auditoria)
CREATE TABLE IF NOT EXISTS sync_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT, -- 'running', 'success', 'partial', 'failed'
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_sync_execution_log_started_at ON sync_execution_log(started_at DESC);

-- Comentário na tabela
COMMENT ON TABLE sync_execution_log IS 'Log de execuções do job de sincronização para auditoria';

-- Habilitar RLS (opcional, se quiser controlar acesso)
ALTER TABLE sync_execution_log ENABLE ROW LEVEL SECURITY;

-- Policy para service role ter acesso total
CREATE POLICY "Service role can manage sync logs"
  ON sync_execution_log
  FOR ALL
  TO service_role
  USING (true);

-- Verificar se o job foi criado com sucesso
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'sync-artia-daily';
  
  IF job_count > 0 THEN
    RAISE NOTICE '✅ Cron job "sync-artia-daily" configurado com sucesso!';
    RAISE NOTICE 'Execução: Diariamente às 05:00 AM (UTC-3) / 08:00 UTC';
  ELSE
    RAISE WARNING '⚠️ Falha ao criar cron job "sync-artia-daily"';
  END IF;
END;
$$;
