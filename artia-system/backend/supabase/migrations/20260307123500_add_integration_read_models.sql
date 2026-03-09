ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'artia_mysql',
  ADD COLUMN IF NOT EXISTS sync_scope_key TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_source_scope ON public.projects(source, sync_scope_key);
CREATE INDEX IF NOT EXISTS idx_projects_last_synced_at ON public.projects(last_synced_at);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  artia_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'artia_mysql',
  sync_scope_key TEXT NOT NULL DEFAULT 'global',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'artia_mysql',
  ADD COLUMN IF NOT EXISTS sync_scope_key TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_activities_project_id ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_id ON public.activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_activities_source_scope ON public.activities(source, sync_scope_key);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'Users can read all activities'
  ) THEN
    CREATE POLICY "Users can read all activities"
      ON public.activities
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'Users can insert activities'
  ) THEN
    CREATE POLICY "Users can insert activities"
      ON public.activities
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'Users can update activities'
  ) THEN
    CREATE POLICY "Users can update activities"
      ON public.activities
      FOR UPDATE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'Users can delete activities'
  ) THEN
    CREATE POLICY "Users can delete activities"
      ON public.activities
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_activities_updated_at'
  ) THEN
    CREATE TRIGGER update_activities_updated_at
      BEFORE UPDATE ON public.activities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.integration_sync_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL DEFAULT 'ready',
  last_synced_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sync_started_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_type, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_states_user_resource ON public.integration_sync_states(user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_integration_sync_states_expiry ON public.integration_sync_states(expires_at);

ALTER TABLE public.integration_sync_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_integration_sync_states_updated_at'
  ) THEN
    CREATE TRIGGER update_integration_sync_states_updated_at
      BEFORE UPDATE ON public.integration_sync_states
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.factorial_daily_hours_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  day DATE NOT NULL,
  worked_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  source_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_factorial_daily_hours_cache_user_day ON public.factorial_daily_hours_cache(user_id, day);
CREATE INDEX IF NOT EXISTS idx_factorial_daily_hours_cache_employee_day ON public.factorial_daily_hours_cache(employee_id, day);

ALTER TABLE public.factorial_daily_hours_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_factorial_daily_hours_cache_updated_at'
  ) THEN
    CREATE TRIGGER update_factorial_daily_hours_cache_updated_at
      BEFORE UPDATE ON public.factorial_daily_hours_cache
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.artia_daily_hours_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artia_user_id TEXT,
  day DATE NOT NULL,
  worked_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  entry_count INTEGER NOT NULL DEFAULT 0,
  source_table TEXT,
  source_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_artia_daily_hours_cache_user_day ON public.artia_daily_hours_cache(user_id, day);
CREATE INDEX IF NOT EXISTS idx_artia_daily_hours_cache_artia_user_day ON public.artia_daily_hours_cache(artia_user_id, day);

ALTER TABLE public.artia_daily_hours_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_artia_daily_hours_cache_updated_at'
  ) THEN
    CREATE TRIGGER update_artia_daily_hours_cache_updated_at
      BEFORE UPDATE ON public.artia_daily_hours_cache
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.artia_time_entries_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artia_user_id TEXT,
  entry_id TEXT NOT NULL,
  day DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  worked_minutes INTEGER NOT NULL DEFAULT 0,
  worked_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  project TEXT,
  project_id TEXT,
  activity_label TEXT,
  activity_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  source_table TEXT,
  source_status TEXT,
  source_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_artia_time_entries_cache_user_day ON public.artia_time_entries_cache(user_id, day);
CREATE INDEX IF NOT EXISTS idx_artia_time_entries_cache_user_activity ON public.artia_time_entries_cache(user_id, activity_id, day);
CREATE INDEX IF NOT EXISTS idx_artia_time_entries_cache_user_project ON public.artia_time_entries_cache(user_id, project_id, day);

ALTER TABLE public.artia_time_entries_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_artia_time_entries_cache_updated_at'
  ) THEN
    CREATE TRIGGER update_artia_time_entries_cache_updated_at
      BEFORE UPDATE ON public.artia_time_entries_cache
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
