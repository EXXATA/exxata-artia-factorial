-- Align public user profiles with Supabase Auth and harden RLS.
-- This migration keeps `password_hash` temporarily for rolling migration of legacy users.

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.users.name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_profile();

alter table public.users
  add constraint users_auth_user_id_fkey
  foreign key (id) references auth.users(id) on delete cascade not valid;

drop policy if exists "Public can delete events" on public.events;
drop policy if exists "Public can insert events" on public.events;
drop policy if exists "Public can update events" on public.events;
drop policy if exists "Public can view events" on public.events;
drop policy if exists "Users can read own events" on public.events;
drop policy if exists "Users can insert own events" on public.events;
drop policy if exists "Users can update own events" on public.events;
drop policy if exists "Users can delete own events" on public.events;

alter table public.events
  alter column user_id type uuid
  using nullif(trim(user_id), '')::uuid;

alter table public.events
  add constraint events_user_id_fkey
  foreign key (user_id) references public.users(id) not valid;

alter table public.integration_sync_states
  add constraint integration_sync_states_user_id_auth_fkey
  foreign key (user_id) references public.users(id) not valid;

alter table public.factorial_daily_hours_cache
  add constraint factorial_daily_hours_cache_user_id_auth_fkey
  foreign key (user_id) references public.users(id) not valid;

alter table public.artia_daily_hours_cache
  add constraint artia_daily_hours_cache_user_id_auth_fkey
  foreign key (user_id) references public.users(id) not valid;

alter table public.artia_time_entries_cache
  add constraint artia_time_entries_cache_user_id_auth_fkey
  foreign key (user_id) references public.users(id) not valid;

alter table public.users drop column if exists artia_token;

drop policy if exists "Allow user registration" on public.users;
drop policy if exists "Users can read own data" on public.users;
drop policy if exists "Users can update own data" on public.users;
drop policy if exists "Users can view own data" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Service role can manage users" on public.users;

create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Service role can manage users"
  on public.users
  for all
  to service_role
  using (true)
  with check (true);

create policy "Users can read own events"
  on public.events
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own events"
  on public.events
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own events"
  on public.events
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own events"
  on public.events
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own integration sync states" on public.integration_sync_states;
drop policy if exists "Users can upsert own integration sync states" on public.integration_sync_states;
drop policy if exists "Users can update own integration sync states" on public.integration_sync_states;
drop policy if exists "Users can delete own integration sync states" on public.integration_sync_states;

create policy "Users can read own integration sync states"
  on public.integration_sync_states
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own integration sync states"
  on public.integration_sync_states
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own integration sync states"
  on public.integration_sync_states
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Service role can manage integration sync states"
  on public.integration_sync_states
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own factorial daily hours cache" on public.factorial_daily_hours_cache;
drop policy if exists "Users can write own factorial daily hours cache" on public.factorial_daily_hours_cache;
create policy "Users can read own factorial daily hours cache"
  on public.factorial_daily_hours_cache
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role can manage factorial daily hours cache"
  on public.factorial_daily_hours_cache
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own artia daily hours cache" on public.artia_daily_hours_cache;
drop policy if exists "Users can write own artia daily hours cache" on public.artia_daily_hours_cache;
create policy "Users can read own artia daily hours cache"
  on public.artia_daily_hours_cache
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role can manage artia daily hours cache"
  on public.artia_daily_hours_cache
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own artia time entries cache" on public.artia_time_entries_cache;
drop policy if exists "Users can write own artia time entries cache" on public.artia_time_entries_cache;
create policy "Users can read own artia time entries cache"
  on public.artia_time_entries_cache
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role can manage artia time entries cache"
  on public.artia_time_entries_cache
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read all projects" on public.projects;
drop policy if exists "Users can insert projects" on public.projects;
drop policy if exists "Users can update projects" on public.projects;
drop policy if exists "Users can delete projects" on public.projects;
create policy "Authenticated users can read projects"
  on public.projects
  for select
  to authenticated
  using (true);

create policy "Service role can manage projects"
  on public.projects
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read all activities" on public.activities;
drop policy if exists "Users can insert activities" on public.activities;
drop policy if exists "Users can update activities" on public.activities;
drop policy if exists "Users can delete activities" on public.activities;
create policy "Authenticated users can read activities"
  on public.activities
  for select
  to authenticated
  using (true);

create policy "Service role can manage activities"
  on public.activities
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.users from anon;
revoke insert, update, delete on table public.events from anon;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'update_updated_at_column'
      and pronargs = 0
  ) then
    execute 'alter function public.update_updated_at_column() set search_path = public';
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'invoke_sync_artia_data'
      and pronargs = 0
  ) then
    execute 'alter function public.invoke_sync_artia_data() set search_path = public';
  end if;
end;
$$;
