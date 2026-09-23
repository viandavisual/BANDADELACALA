-- BANDA DE LA CALA · actualització Supabase v0.25
-- Soluciona NOM + AVATAR del propi USER amb UPDATE directe protegit per RLS.
-- És idempotent: es pot executar una vegada sobre el projecte actual.

begin;

alter table public.profiles add column if not exists avatar_key text;

alter table public.profiles drop constraint if exists profiles_avatar_key_check;
alter table public.profiles add constraint profiles_avatar_key_check
  check (avatar_key is null or avatar_key ~ '^avatar[0-9]+$');

alter table public.profiles enable row level security;

-- El USER autenticat només rep permís SQL per modificar NOM + AVATAR.
-- No pot modificar role, email, created_by ni must_change_password amb aquest UPDATE.
revoke update on public.profiles from authenticated;
grant update (name, avatar_key) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "profiles update own name avatar" on public.profiles;
create policy "profiles update own name avatar"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Mantenim també la RPC com a compatibilitat amb versions anteriors.
create or replace function public.update_own_banda_profile(
  p_name text,
  p_avatar_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  clean_avatar text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  clean_name := btrim(coalesce(p_name,''));
  clean_avatar := nullif(btrim(coalesce(p_avatar_key,'')),'');
  if char_length(clean_name) < 1 or char_length(clean_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if clean_avatar is not null and clean_avatar !~ '^avatar[0-9]+$' then raise exception 'INVALID_AVATAR'; end if;
  update public.profiles set name=clean_name, avatar_key=clean_avatar where user_id=auth.uid();
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
end;
$$;
grant execute on function public.update_own_banda_profile(text,text) to authenticated;

commit;
