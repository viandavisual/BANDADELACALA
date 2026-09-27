-- BANDA DE LA CALA v0.68
-- Persistència del CROP manual de les APORTACIONS.
-- Executar UNA SOLA VEGADA al SQL Editor del projecte Supabase.

begin;

alter table public.archive_submissions add column if not exists crop_left numeric not null default 0;
alter table public.archive_submissions add column if not exists crop_right numeric not null default 0;
alter table public.archive_submissions add column if not exists crop_top numeric not null default 0;
alter table public.archive_submissions add column if not exists crop_bottom numeric not null default 0;

commit;
