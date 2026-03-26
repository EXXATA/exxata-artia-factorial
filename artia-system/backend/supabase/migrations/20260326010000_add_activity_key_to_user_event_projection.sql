ALTER TABLE public.user_event_projection
  ADD COLUMN IF NOT EXISTS activity_key text;

UPDATE public.user_event_projection
SET activity_key = COALESCE(
  NULLIF(activity_key, ''),
  NULLIF(activity_id, ''),
  CONCAT(
    COALESCE(NULLIF(project_key, ''), 'sem-projeto'),
    '::',
    COALESCE(
      NULLIF(REGEXP_REPLACE(LOWER(TRIM(COALESCE(activity_label, 'sem-atividade'))), '[^a-z0-9]+', '-', 'g'), ''),
      'sem-atividade'
    )
  )
)
WHERE activity_key IS NULL OR activity_key = '';

CREATE INDEX IF NOT EXISTS idx_user_event_projection_user_project_day_start_time
  ON public.user_event_projection(user_id, project_key, day, start_time);

CREATE INDEX IF NOT EXISTS idx_user_event_projection_user_activity_day_start_time
  ON public.user_event_projection(user_id, activity_key, day, start_time);

CREATE INDEX IF NOT EXISTS idx_user_activity_day_rollups_user_activity_key_day
  ON public.user_activity_day_rollups(user_id, activity_key, day);

ALTER POLICY "Users can read own events"
  ON public.events
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can delete own events"
  ON public.events
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can insert own events"
  ON public.events
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can update own events"
  ON public.events
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can read own project access cache"
  ON public.user_project_access_cache
  USING (user_id = ((SELECT auth.uid()))::text);

ALTER POLICY "Users can read own event projections"
  ON public.user_event_projection
  USING (user_id = ((SELECT auth.uid()))::text);

ALTER POLICY "Users can read own day rollups"
  ON public.user_day_rollups
  USING (user_id = ((SELECT auth.uid()))::text);

ALTER POLICY "Users can read own project day rollups"
  ON public.user_project_day_rollups
  USING (user_id = ((SELECT auth.uid()))::text);

ALTER POLICY "Users can read own activity day rollups"
  ON public.user_activity_day_rollups
  USING (user_id = ((SELECT auth.uid()))::text);

ALTER POLICY "Users can read own factorial daily hours cache"
  ON public.factorial_daily_hours_cache
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can read own artia daily hours cache"
  ON public.artia_daily_hours_cache
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can read own artia time entries cache"
  ON public.artia_time_entries_cache
  USING (user_id = (SELECT auth.uid()));
