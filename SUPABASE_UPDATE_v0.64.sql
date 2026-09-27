-- BANDA DE LA CALA v0.64
-- Aportacions multimedia de USERS registrats + cua de moderacio ADMIN/GESTOR.
-- Executar UNA SOLA VEGADA al SQL Editor del projecte Supabase.

begin;

create table if not exists public.archive_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitter_name text not null default '',
  submitter_email text not null default '',
  media_type text not null default 'photo',
  year integer not null,
  month integer null,
  day integer null,
  title text not null default '',
  description text not null default '',
  author_source text not null default '',
  storage_path text not null unique,
  original_filename text not null default '',
  mime_type text not null default '',
  file_size bigint not null default 0,
  status text not null default 'pending',
  rejection_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  published_item_id text not null default '',
  published_url text not null default '',
  constraint archive_submissions_media_type_check check (media_type in ('photo','cartell')),
  constraint archive_submissions_status_check check (status in ('pending','validated','rejected')),
  constraint archive_submissions_year_check check (year between 1800 and 2200),
  constraint archive_submissions_month_check check (month is null or month between 1 and 12),
  constraint archive_submissions_day_check check (day is null or day between 1 and 31)
);

alter table public.archive_submissions enable row level security;

grant select, insert, update on public.archive_submissions to authenticated;
grant all on public.archive_submissions to service_role;

drop policy if exists "archive submissions select own or editor" on public.archive_submissions;
create policy "archive submissions select own or editor"
on public.archive_submissions for select to authenticated
using (auth.uid() = user_id or public.is_banda_editor());

drop policy if exists "archive submissions insert own pending" on public.archive_submissions;
create policy "archive submissions insert own pending"
on public.archive_submissions for insert to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and media_type in ('photo','cartell')
);

drop policy if exists "archive submissions editor update" on public.archive_submissions;
create policy "archive submissions editor update"
on public.archive_submissions for update to authenticated
using (public.is_banda_editor())
with check (public.is_banda_editor());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'archive-submissions',
  'archive-submissions',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp']
)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- USER registrat: nomes pot pujar originals a la seva propia ruta pending/<uid>/...
drop policy if exists "archive user upload own pending" on storage.objects;
create policy "archive user upload own pending"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'archive-submissions'
  and (storage.foldername(name))[1] = 'pending'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- El propietari pot llegir la seva aportacio; ADMIN/GESTOR pot revisar-les totes.
drop policy if exists "archive select own or editor" on storage.objects;
create policy "archive select own or editor"
on storage.objects for select to authenticated
using (
  bucket_id = 'archive-submissions'
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.is_banda_editor()
  )
);

-- Moure pending/rejected/validated exigeix UPDATE + DELETE/INSERT. Només EDITOR.
drop policy if exists "archive editor update objects" on storage.objects;
create policy "archive editor update objects"
on storage.objects for update to authenticated
using (bucket_id = 'archive-submissions' and public.is_banda_editor())
with check (bucket_id = 'archive-submissions' and public.is_banda_editor());

drop policy if exists "archive editor delete objects" on storage.objects;
create policy "archive editor delete objects"
on storage.objects for delete to authenticated
using (bucket_id = 'archive-submissions' and public.is_banda_editor());

-- Necessari per a storage.move() quan el desti es crea com un objecte nou.
drop policy if exists "archive editor insert objects" on storage.objects;
create policy "archive editor insert objects"
on storage.objects for insert to authenticated
with check (bucket_id = 'archive-submissions' and public.is_banda_editor());

create index if not exists archive_submissions_status_created_idx
on public.archive_submissions(status,created_at);

create index if not exists archive_submissions_user_idx
on public.archive_submissions(user_id,created_at desc);

commit;
