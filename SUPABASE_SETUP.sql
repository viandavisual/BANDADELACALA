-- BANDA DE LA CALA · v0.15
-- Executa aquest script UNA VEGADA a Supabase > SQL Editor.
-- És segur tornar-lo a executar: les polítiques es recreen i la fila principal es conserva.

begin;

create table if not exists public.app_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.app_content enable row level security;

grant select on public.app_content to anon;
grant select, insert, update, delete on public.app_content to authenticated;
grant all on public.app_content to service_role;

drop policy if exists "public can read app content" on public.app_content;
create policy "public can read app content"
on public.app_content for select
to anon, authenticated
using (true);

drop policy if exists "authenticated can insert app content" on public.app_content;
create policy "authenticated can insert app content"
on public.app_content for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update app content" on public.app_content;
create policy "authenticated can update app content"
on public.app_content for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete app content" on public.app_content;
create policy "authenticated can delete app content"
on public.app_content for delete
to authenticated
using (true);

insert into public.app_content(id,content)
values ('main','{}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'gestor' check (role in ('admin','gestor','music')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "authenticated can read profiles" on public.profiles;
create policy "authenticated can read profiles"
on public.profiles for select
to authenticated
using (true);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(user_id,email,role)
  values (new.id,new.email,'gestor')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_banda on auth.users;
create trigger on_auth_user_created_banda
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

-- Storage públic per a contingut visible a l'APP.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('player-audio','player-audio',true,52428800,array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg']),
  ('historic-media','historic-media',true,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('app-images','app-images',true,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read banda media" on storage.objects;
create policy "public read banda media"
on storage.objects for select
to public
using (bucket_id in ('player-audio','historic-media','app-images'));

drop policy if exists "authenticated upload banda media" on storage.objects;
create policy "authenticated upload banda media"
on storage.objects for insert
to authenticated
with check (bucket_id in ('player-audio','historic-media','app-images'));

drop policy if exists "authenticated update banda media" on storage.objects;
create policy "authenticated update banda media"
on storage.objects for update
to authenticated
using (bucket_id in ('player-audio','historic-media','app-images'))
with check (bucket_id in ('player-audio','historic-media','app-images'));

drop policy if exists "authenticated delete banda media" on storage.objects;
create policy "authenticated delete banda media"
on storage.objects for delete
to authenticated
using (bucket_id in ('player-audio','historic-media','app-images'));

-- Realtime per a la fila de contingut principal.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='app_content'
  ) then
    alter publication supabase_realtime add table public.app_content;
  end if;
end $$;

commit;
