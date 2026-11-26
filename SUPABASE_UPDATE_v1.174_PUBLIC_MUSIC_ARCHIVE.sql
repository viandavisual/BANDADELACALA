-- BANDA DE LA CALA v1.174 — Exposició pública NOMÉS de MÚSICA INTERPRETADA.
-- Aplicar UNA vegada a Supabase > SQL Editor. Operació additiva i no destructiva.
-- No afecta cap compte, perfil, puntuació ni el contingut privat de DEMOS.
-- No substitueix la funció existent sync_banda_public_content():
-- afegeix un filtre final al mirror públic perquè sigui compatible amb altres versions.
BEGIN;

CREATE OR REPLACE FUNCTION public.banda_enrich_public_music_archives()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  source_settings jsonb := '{}'::jsonb;
  selected_ids jsonb := '[]'::jsonb;
  archives jsonb := '[]'::jsonb;
  public_archives jsonb := '[]'::jsonb;
  public_settings jsonb := '{}'::jsonb;
BEGIN
  SELECT COALESCE(content->'settings', '{}'::jsonb)
    INTO source_settings
    FROM public.app_content
    WHERE id = NEW.id;

  source_settings := COALESCE(source_settings, '{}'::jsonb);
  IF jsonb_typeof(source_settings) <> 'object' THEN
    source_settings := '{}'::jsonb;
  END IF;

  selected_ids := COALESCE(source_settings->'historicMusicArchiveIds','[]'::jsonb);
  archives := COALESCE(source_settings->'demoArchives','[]'::jsonb);
  IF jsonb_typeof(selected_ids) <> 'array' THEN selected_ids := '[]'::jsonb; END IF;
  IF jsonb_typeof(archives) <> 'array' THEN archives := '[]'::jsonb; END IF;

  -- Important: NO publicar l'arxiu privat complet de DEMOS.
  -- Copiar únicament les llistes seleccionades explícitament a EDITOR > HISTÒRIC.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.item->>'id',
    'name', COALESCE(a.item->>'name',''),
    'demos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title',COALESCE(song.value->>'title',''),
        'url',COALESCE(song.value->>'url',''),
        'videoId',COALESCE(song.value->>'videoId','')
      ) ORDER BY song.ordinality)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(a.item->'demos') = 'array'
             THEN a.item->'demos' ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS song(value, ordinality)
    ),'[]'::jsonb)
  ) ORDER BY a.ordinality),'[]'::jsonb)
  INTO public_archives
  FROM jsonb_array_elements(archives) WITH ORDINALITY AS a(item, ordinality)
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(selected_ids) AS chosen(id)
    WHERE chosen.id = a.item->>'id'
  );

  public_settings := COALESCE(NEW.content->'settings','{}'::jsonb);
  IF jsonb_typeof(public_settings) <> 'object' THEN
    public_settings := '{}'::jsonb;
  END IF;

  NEW.content := jsonb_set(
    COALESCE(NEW.content,'{}'::jsonb),
    '{settings}',
    public_settings || jsonb_build_object(
      'historicMusicArchiveIds',selected_ids,
      'historicMusicArchiveSortMode',COALESCE(source_settings->>'historicMusicArchiveSortMode','year'),
      'historicMusicArchiveOrder',CASE
        WHEN jsonb_typeof(source_settings->'historicMusicArchiveOrder')='array'
        THEN source_settings->'historicMusicArchiveOrder' ELSE '[]'::jsonb END,
      'demoArchives',public_archives
    ),
    true
  );
  RETURN NEW;
END;
$$;

-- Funció de trigger no cridable manualment des de clients web.
REVOKE ALL ON FUNCTION public.banda_enrich_public_music_archives() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.banda_enrich_public_music_archives() FROM anon, authenticated;

DROP TRIGGER IF EXISTS banda_public_music_archives_subset ON public.app_public_content;
CREATE TRIGGER banda_public_music_archives_subset
BEFORE INSERT OR UPDATE OF content ON public.app_public_content
FOR EACH ROW EXECUTE FUNCTION public.banda_enrich_public_music_archives();

-- Refrescar la còpia pública existent sense tocar app_content ni els usuaris.
UPDATE public.app_public_content SET content = content WHERE id = 'main';

COMMIT;

-- COMPROVACIÓ (només lectura; executar opcionalment després):
-- SELECT jsonb_array_length(COALESCE(content#>'{settings,demoArchives}','[]'::jsonb)) AS playlists_publiques
-- FROM public.app_public_content WHERE id='main';
