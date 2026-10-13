-- BANDA DE LA CALA · v0.93
-- Actualitza la còpia pública perquè USERS no registrats puguin:
-- 1) veure HEMEROTECA,
-- 2) respectar exclusions de fotos HOME/PLAYER,
-- 3) veure només la informació necessària dels CONCERTS a HOME.

begin;

create or replace function public.sync_banda_public_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  public_json jsonb;
  public_concerts jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',coalesce(e->>'id',''),
    'type','CONCERT',
    'title',coalesce(e->>'title',''),
    'date',coalesce(e->>'date',''),
    'time',coalesce(e->>'time',''),
    'place',coalesce(e->>'place','')
  )), '[]'::jsonb)
  into public_concerts
  from jsonb_array_elements(coalesce(new.content->'events','[]'::jsonb)) e
  where upper(coalesce(e->>'type',''))='CONCERT';

  public_json := jsonb_build_object(
    'version',coalesce(new.content->'version',to_jsonb(4)),
    'updatedAt',coalesce(new.content->'updatedAt',to_jsonb(new.updated_at)),
    'settings',jsonb_build_object(
      'homeHeroImage',coalesce(new.content#>>'{settings,homeHeroImage}',''),
      'homeHeroMode',coalesce(new.content#>>'{settings,homeHeroMode}','random'),
      'homeHeroExcludedImages',coalesce(new.content#>'{settings,homeHeroExcludedImages}','[]'::jsonb),
      'minigames',coalesce(new.content#>'{settings,minigames}','{}'::jsonb),
      'homeCards',coalesce(new.content#>'{settings,homeCards}','{}'::jsonb),
      'supabaseInitialized',true
    ),
    'events',public_concerts,
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
create trigger on_app_content_sync_public
  after insert or update of content,updated_at on public.app_content
  for each row execute procedure public.sync_banda_public_content();

-- Refresca immediatament la còpia pública actual.
update public.app_content set updated_at=now() where id='main';

commit;
