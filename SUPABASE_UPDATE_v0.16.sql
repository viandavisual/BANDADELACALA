-- BANDA DE LA CALA · actualització Supabase v0.15 -> v0.16
-- EXECUTA AQUEST SCRIPT ABANS de publicar editor.html v0.16.
-- Objectiu: permetre registre públic sense donar permisos d'edició automàticament.

begin;

-- 1) Els usuaris ja existents es consideren gestors de la instal·lació actual.
insert into public.profiles(user_id,email,role)
select id,email,'gestor' from auth.users
on conflict (user_id) do nothing;

-- 2) Nous comptes: rol PENDING fins que els autoritzis.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','gestor','music','pending'));
alter table public.profiles alter column role set default 'pending';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(user_id,email,role)
  values (new.id,new.email,'pending')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_banda on auth.users;
create trigger on_auth_user_created_banda after insert on auth.users for each row execute procedure public.handle_new_user_profile();

-- 3) Funció única per comprovar qui pot publicar.
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

-- 4) Cada usuari autenticat pot llegir el seu propi perfil.
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
drop policy if exists "authenticated can read profiles" on public.profiles;
drop policy if exists "authenticated can read own profile" on public.profiles;
create policy "authenticated can read own profile" on public.profiles
for select to authenticated using (auth.uid() = user_id);

-- 5) El contingut és públic de lectura, però només ADMIN/GESTOR pot modificar-lo.
drop policy if exists "authenticated can insert app content" on public.app_content;
create policy "authenticated can insert app content" on public.app_content
for insert to authenticated with check (public.is_banda_editor());

drop policy if exists "authenticated can update app content" on public.app_content;
create policy "authenticated can update app content" on public.app_content
for update to authenticated using (public.is_banda_editor()) with check (public.is_banda_editor());

drop policy if exists "authenticated can delete app content" on public.app_content;
create policy "authenticated can delete app content" on public.app_content
for delete to authenticated using (public.is_banda_editor());

-- 6) El mateix criteri per a fitxers de Storage.
drop policy if exists "authenticated upload banda media" on storage.objects;
create policy "authenticated upload banda media" on storage.objects
for insert to authenticated
with check (bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());

drop policy if exists "authenticated update banda media" on storage.objects;
create policy "authenticated update banda media" on storage.objects
for update to authenticated
using (bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor())
with check (bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());

drop policy if exists "authenticated delete banda media" on storage.objects;
create policy "authenticated delete banda media" on storage.objects
for delete to authenticated
using (bucket_id in ('player-audio','historic-media','app-images') and public.is_banda_editor());

commit;
