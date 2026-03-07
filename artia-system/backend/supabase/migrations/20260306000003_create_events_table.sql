-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  day DATE NOT NULL,
  project TEXT NOT NULL,
  activity_id TEXT,
  activity_label TEXT NOT NULL,
  notes TEXT DEFAULT '',
  artia_launched BOOLEAN DEFAULT false,
  workplace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_day ON events(day);
CREATE INDEX idx_events_project ON events(project);
CREATE INDEX idx_events_user_day ON events(user_id, day);
CREATE INDEX idx_events_user_project ON events(user_id, project);
CREATE INDEX idx_events_event_id ON events(event_id);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read only their own events
CREATE POLICY "Users can read own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Create policy for users to insert their own events
CREATE POLICY "Users can insert own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Create policy for users to update their own events
CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Create policy for users to delete their own events
CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Create updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
