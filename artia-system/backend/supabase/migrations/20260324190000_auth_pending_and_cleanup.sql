alter table public.users
  alter column artia_user_id drop not null;

alter table public.users
  drop column if exists password_hash;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_profile_id uuid;
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  select id
    into existing_profile_id
    from public.users
   where lower(email) = lower(new.email)
   order by created_at asc
   limit 1;

  if existing_profile_id is not null and existing_profile_id <> new.id then
    update public.users
       set email = new.email,
           name = coalesce(resolved_name, public.users.name),
           updated_at = now()
     where id = existing_profile_id;

    return new;
  end if;

  insert into public.users (id, email, name, created_at, updated_at)
  values (
    new.id,
    new.email,
    resolved_name,
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
