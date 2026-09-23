-- BANDA DE LA CALA · v0.31
-- Publica HEMEROTECA junto con HISTÒRIC para usuarios no registrados.
-- No crea tablas ni buckets nuevos.

begin;

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

-- Refresca inmediatamente la copia pública actual.
update public.app_content set updated_at=now() where id='main';

commit;
