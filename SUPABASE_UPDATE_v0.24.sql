-- BANDA DE LA CALA · actualització Supabase v0.24
-- EXECUTA AQUEST SCRIPT UNA SOLA VEGADA abans d'utilitzar NOM + AVATAR a la v0.24.
-- No modifica rols, Auth ni contingut de l'APP.

begin;

alter table public.profiles
  add column if not exists avatar_key text;

alter table public.profiles
  drop constraint if exists profiles_avatar_key_check;

alter table public.profiles
  add constraint profiles_avatar_key_check
  check (avatar_key is null or avatar_key ~ '^avatar[0-9]+$');

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
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  clean_name := btrim(coalesce(p_name,''));
  clean_avatar := nullif(btrim(coalesce(p_avatar_key,'')),'');

  if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
    raise exception 'INVALID_NAME';
  end if;

  if clean_avatar is not null and clean_avatar !~ '^avatar[0-9]+$' then
    raise exception 'INVALID_AVATAR';
  end if;

  update public.profiles
  set name = clean_name,
      avatar_key = clean_avatar
  where user_id = auth.uid();

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.update_own_banda_profile(text,text) to authenticated;

commit;
