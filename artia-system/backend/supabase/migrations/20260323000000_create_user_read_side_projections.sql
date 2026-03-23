CREATE TABLE IF NOT EXISTS user_project_access_cache (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  source TEXT DEFAULT 'artia_mysql',
  last_synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS user_event_projection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  day DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  project TEXT NOT NULL,
  project_key TEXT NOT NULL,
  project_id TEXT,
  project_number TEXT,
  project_name TEXT,
  project_label TEXT,
  project_display_label TEXT,
  activity_id TEXT,
  activity_label TEXT NOT NULL,
  notes TEXT DEFAULT '',
  artia_launched BOOLEAN DEFAULT FALSE,
  sync_status TEXT NOT NULL,
  sync_label TEXT NOT NULL,
  remote_entry_id TEXT,
  remote_project TEXT,
  remote_activity TEXT,
  remote_hours NUMERIC(10, 2) DEFAULT 0,
  remote_start TIMESTAMPTZ,
  remote_end TIMESTAMPTZ,
  has_project_access BOOLEAN DEFAULT FALSE,
  artia_source_available BOOLEAN DEFAULT FALSE,
  artia_source_table TEXT,
  artia_sync_reason TEXT,
  last_computed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_day_rollups (
  user_id TEXT NOT NULL,
  day DATE NOT NULL,
  factorial_hours NUMERIC(10, 2) DEFAULT 0,
  system_hours NUMERIC(10, 2) DEFAULT 0,
  synced_hours NUMERIC(10, 2) DEFAULT 0,
  pending_hours NUMERIC(10, 2) DEFAULT 0,
  manual_hours NUMERIC(10, 2) DEFAULT 0,
  artia_hours NUMERIC(10, 2) DEFAULT 0,
  artia_entry_count INTEGER DEFAULT 0,
  remote_only_count INTEGER DEFAULT 0,
  remote_only_hours NUMERIC(10, 2) DEFAULT 0,
  artia_source_available BOOLEAN DEFAULT FALSE,
  artia_source_table TEXT,
  artia_read_reason TEXT,
  artia_entries_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  remote_only_entries_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_computed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS user_project_day_rollups (
  user_id TEXT NOT NULL,
  day DATE NOT NULL,
  project_key TEXT NOT NULL,
  project_id TEXT,
  project_number TEXT,
  project_name TEXT,
  project_label TEXT,
  system_hours NUMERIC(10, 2) DEFAULT 0,
  synced_hours NUMERIC(10, 2) DEFAULT 0,
  pending_hours NUMERIC(10, 2) DEFAULT 0,
  manual_hours NUMERIC(10, 2) DEFAULT 0,
  system_event_count INTEGER DEFAULT 0,
  artia_hours NUMERIC(10, 2) DEFAULT 0,
  artia_entry_count INTEGER DEFAULT 0,
  remote_only_hours NUMERIC(10, 2) DEFAULT 0,
  remote_only_entry_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day, project_key)
);

CREATE TABLE IF NOT EXISTS user_activity_day_rollups (
  user_id TEXT NOT NULL,
  day DATE NOT NULL,
  project_key TEXT NOT NULL,
  project_id TEXT,
  project_number TEXT,
  project_name TEXT,
  project_label TEXT,
  activity_key TEXT NOT NULL,
  activity_id TEXT,
  activity_label TEXT NOT NULL,
  system_hours NUMERIC(10, 2) DEFAULT 0,
  synced_hours NUMERIC(10, 2) DEFAULT 0,
  pending_hours NUMERIC(10, 2) DEFAULT 0,
  manual_hours NUMERIC(10, 2) DEFAULT 0,
  system_event_count INTEGER DEFAULT 0,
  artia_hours NUMERIC(10, 2) DEFAULT 0,
  artia_entry_count INTEGER DEFAULT 0,
  remote_only_hours NUMERIC(10, 2) DEFAULT 0,
  remote_only_entry_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day, project_key, activity_key)
);

CREATE INDEX IF NOT EXISTS idx_events_user_day_start_time ON events(user_id, day, start_time);
CREATE INDEX IF NOT EXISTS idx_user_project_access_cache_user_project ON user_project_access_cache(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_user_event_projection_user_day_start_time ON user_event_projection(user_id, day, start_time);
CREATE INDEX IF NOT EXISTS idx_user_day_rollups_user_day ON user_day_rollups(user_id, day);
CREATE INDEX IF NOT EXISTS idx_user_project_day_rollups_user_project_day ON user_project_day_rollups(user_id, project_key, day);
CREATE INDEX IF NOT EXISTS idx_user_activity_day_rollups_user_activity_day ON user_activity_day_rollups(user_id, activity_id, day);

ALTER TABLE user_project_access_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_day_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_day_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_day_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project access cache"
  ON user_project_access_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can read own event projections"
  ON user_event_projection
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can read own day rollups"
  ON user_day_rollups
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can read own project day rollups"
  ON user_project_day_rollups
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can read own activity day rollups"
  ON user_activity_day_rollups
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE TRIGGER update_user_project_access_cache_updated_at
  BEFORE UPDATE ON user_project_access_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_event_projection_updated_at
  BEFORE UPDATE ON user_event_projection
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_day_rollups_updated_at
  BEFORE UPDATE ON user_day_rollups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_project_day_rollups_updated_at
  BEFORE UPDATE ON user_project_day_rollups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_day_rollups_updated_at
  BEFORE UPDATE ON user_activity_day_rollups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
