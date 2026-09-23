-- BANDA DE LA CALA · esquema completo compatible con v0.31
-- Configuració completa per a un projecte Supabase NOU.
-- Para un proyecto existente, no vuelvas a ejecutar este esquema completo: aplica únicamente los SUPABASE_UPDATE_vX.XX.sql posteriores que correspondan. En v0.31, ejecuta SUPABASE_UPDATE_v0.31.sql.

begin;

create table if not exists public.app_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_key text,
  role text not null default 'standard',
  must_change_password boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin','gestor','standard')),
  constraint profiles_avatar_key_check check (avatar_key is null or avatar_key ~ '^avatar[0-9]+$')
);

create table if not exists public.app_public_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.is_banda_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin','gestor')
  );
$$;
grant execute on function public.is_banda_editor() to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(user_id,email,name,role,must_change_password)
  values (
    new.id,new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)),
    'standard',
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean,false)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_banda on auth.users;
create trigger on_auth_user_created_banda after insert on auth.users for each row execute procedure public.handle_new_user_profile();

create or replace function public.mark_own_password_changed()
returns void
language sql
security definer
set search_path = public
as $$ update public.profiles set must_change_password=false where user_id=auth.uid(); $$;
grant execute on function public.mark_own_password_changed() to authenticated;


create or replace function public.update_own_banda_profile(p_name text,p_avatar_key text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare clean_name text; clean_avatar text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  clean_name:=btrim(coalesce(p_name,''));
  clean_avatar:=nullif(btrim(coalesce(p_avatar_key,'')),'');
  if char_length(clean_name)<1 or char_length(clean_name)>120 then raise exception 'INVALID_NAME'; end if;
  if clean_avatar is not null and clean_avatar !~ '^avatar[0-9]+$' then raise exception 'INVALID_AVATAR'; end if;
  update public.profiles set name=clean_name,avatar_key=clean_avatar where user_id=auth.uid();
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
end;
$$;
grant execute on function public.update_own_banda_profile(text,text) to authenticated;

create or replace function public.sync_banda_public_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare public_json jsonb;
begin
  public_json := jsonb_build_object(
    'version',coalesce(new.content->'version',to_jsonb(4)),
    'updatedAt',coalesce(new.content->'updatedAt',to_jsonb(new.updated_at)),
    'settings',jsonb_build_object('homeHeroImage',coalesce(new.content#>>'{settings,homeHeroImage}',''),'supabaseInitialized',true),
    'events','[]'::jsonb,
    'dresscodes','[]'::jsonb,
    'tracks',coalesce(new.content->'tracks','[]'::jsonb),
    'historicItems',coalesce(new.content->'historicItems','[]'::jsonb),
    'hemerotecaItems',coalesce(new.content->'hemerotecaItems','[]'::jsonb)
  );
  insert into public.app_public_content(id,content,updated_at)
  values(new.id,public_json,new.updated_at)
  on conflict(id) do update set content=excluded.content,updated_at=excluded.updated_at;
  return new;
end;
$$;
drop trigger if exists on_app_content_sync_public on public.app_content;
create trigger on_app_content_sync_public after insert or update of content,updated_at on public.app_content for each row execute procedure public.sync_banda_public_content();

alter table public.app_content enable row level security;
grant select,insert,update,delete on public.app_content to authenticated;
grant all on public.app_content to service_role;
create policy "authenticated can read full app content" on public.app_content for select to authenticated using(true);
create policy "authenticated can insert app content" on public.app_content for insert to authenticated with check(public.is_banda_editor());
create policy "authenticated can update app content" on public.app_content for update to authenticated using(public.is_banda_editor()) with check(public.is_banda_editor());
create policy "authenticated can delete app content" on public.app_content for delete to authenticated using(public.is_banda_editor());

alter table public.app_public_content enable row level security;
grant select on public.app_public_content to anon,authenticated;
create policy "public can read public app content" on public.app_public_content for select to anon,authenticated using(true);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy "profiles select self or editor" on public.profiles for select to authenticated using(auth.uid()=user_id or public.is_banda_editor());
revoke update on public.profiles from authenticated;
grant update (name,avatar_key) on public.profiles to authenticated;
create policy "profiles update own name avatar" on public.profiles for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.app_content(id,content) values('main','{}'::jsonb) on conflict(id) do nothing;
update public.app_content set updated_at=updated_at where id='main';

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('player-audio','player-audio',true,52428800,array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg']),
  ('historic-media','historic-media',true,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('app-images','app-images',true,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "public read banda media" on storage.objects for select to public using(bucket_id in ('player-audio','historic-media','app-images'));
create policy "authenticated upload banda media" on storage.objects for insert to authenticated with check(bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());
create policy "authenticated update banda media" on storage.objects for update to authenticated using(bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor()) with check(bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());
create policy "authenticated delete banda media" on storage.objects for delete to authenticated using(bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_content') then
    alter publication supabase_realtime add table public.app_content;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_public_content') then
    alter publication supabase_realtime add table public.app_public_content;
  end if;
end $$;

commit;
