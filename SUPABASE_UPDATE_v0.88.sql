-- BANDA DE LA CALA v0.88
-- Bústia de suggeriments per a USERS registrats + gestió ADMIN/GESTOR.
-- Executar UNA SOLA VEGADA al SQL Editor del projecte Supabase.

begin;

create table if not exists public.app_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submitter_name text not null default '',
  submitter_email text not null default '',
  suggestion text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  archived_at timestamptz null,
  archived_by uuid null references auth.users(id) on delete set null,
  archived_by_name text not null default '',
  constraint app_suggestions_status_check check (status in ('pending','archived')),
  constraint app_suggestions_text_check check (char_length(btrim(suggestion)) between 1 and 2000)
);

alter table public.app_suggestions enable row level security;

grant select, insert, update, delete on public.app_suggestions to authenticated;
grant all on public.app_suggestions to service_role;

drop policy if exists "suggestions select own or editor" on public.app_suggestions;
create policy "suggestions select own or editor"
on public.app_suggestions for select to authenticated
using (auth.uid() = user_id or public.is_banda_editor());

drop policy if exists "suggestions insert own pending" on public.app_suggestions;
create policy "suggestions insert own pending"
on public.app_suggestions for insert to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and archived_at is null
  and archived_by is null
  and archived_by_name = ''
);

drop policy if exists "suggestions editor update" on public.app_suggestions;
create policy "suggestions editor update"
on public.app_suggestions for update to authenticated
using (public.is_banda_editor())
with check (public.is_banda_editor());

drop policy if exists "suggestions editor delete" on public.app_suggestions;
create policy "suggestions editor delete"
on public.app_suggestions for delete to authenticated
using (public.is_banda_editor());

create index if not exists app_suggestions_status_created_idx
on public.app_suggestions(status,created_at desc);

commit;
