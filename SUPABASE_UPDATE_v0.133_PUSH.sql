-- v0.133 · Executeu al SQL Editor de Supabase abans d'activar el registre PUSH.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "user reads own push subscriptions" on public.push_subscriptions;
create policy "user reads own push subscriptions" on public.push_subscriptions for select to authenticated using (auth.uid()=user_id);
drop policy if exists "user inserts own push subscriptions" on public.push_subscriptions;
create policy "user inserts own push subscriptions" on public.push_subscriptions for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "user updates own push subscriptions" on public.push_subscriptions;
create policy "user updates own push subscriptions" on public.push_subscriptions for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "user deletes own push subscriptions" on public.push_subscriptions;
create policy "user deletes own push subscriptions" on public.push_subscriptions for delete to authenticated using (auth.uid()=user_id);
-- El servidor d'enviament ha d'usar service_role només al backend, mai al navegador.
