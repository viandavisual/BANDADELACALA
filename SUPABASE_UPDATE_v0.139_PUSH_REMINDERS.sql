-- BANDA DE LA CALA v0.139. Executar a Supabase SQL Editor.
-- Registre d'enviaments per no duplicar recordatoris.
create table if not exists public.push_reminder_deliveries (
  job_key text primary key,
  event_id text not null,
  hours_before integer not null check (hours_before in (9,24)),
  status text not null default 'processing',
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.push_reminder_deliveries enable row level security;
revoke all on public.push_reminder_deliveries from anon, authenticated;
grant select, insert, update, delete on public.push_reminder_deliveries to service_role;
-- Sense polítiques per anon/authenticated: només les Edge Functions amb service_role.
