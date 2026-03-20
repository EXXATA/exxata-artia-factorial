alter table public.integration_sync_states
  drop constraint if exists integration_sync_states_user_id_auth_fkey;

alter table public.factorial_daily_hours_cache
  drop constraint if exists factorial_daily_hours_cache_user_id_auth_fkey;

alter table public.artia_daily_hours_cache
  drop constraint if exists artia_daily_hours_cache_user_id_auth_fkey;

alter table public.artia_time_entries_cache
  drop constraint if exists artia_time_entries_cache_user_id_auth_fkey;
