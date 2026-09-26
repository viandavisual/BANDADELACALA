-- BANDA DE LA CALA · v0.52
-- QUINA NOTA ÉS? · cicle diari 03:00→03:00 (Europe/Madrid)
-- + repte públic per a convidats (sense marcador)
-- + punts persistents exclusivament per a USERS registrats.
-- Executar UNA vegada al SQL Editor de Supabase abans de publicar/provar v0.52.

begin;

alter table public.profiles
  add column if not exists quina_nota_last_played_date date,
  add column if not exists quina_nota_last_result_correct boolean,
  add column if not exists quina_nota_points_total integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='profiles_quina_nota_points_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_quina_nota_points_nonnegative
      check (quina_nota_points_total >= 0);
  end if;
end $$;

-- El "dia de joc" canvia exactament a les 03:00 hora Europe/Madrid.
-- 02:59 pertany al cicle anterior; 03:00 ja pertany al nou cicle.
create or replace function public.quina_nota_cycle_date()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (((now() at time zone 'Europe/Madrid') - interval '3 hours')::date);
$$;

revoke all on function public.quina_nota_cycle_date() from public;
revoke all on function public.quina_nota_cycle_date() from anon;
revoke all on function public.quina_nota_cycle_date() from authenticated;
grant execute on function public.quina_nota_cycle_date() to service_role;

-- Helper determinista. Mateix cicle = mateix repte per a tothom.
-- La resposta correcta no s'exposa als clients abans de jugar.
create or replace function public.quina_nota_challenge_for_date(p_date date)
returns jsonb
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  raw bytea;
  clef_index integer;
  clef_id text;
  bottom_letter text;
  min_step integer;
  max_step integer;
  step_value integer;
  accidental text;
  accidental_threshold integer;
  idx integer;
  letters text[] := array['C','D','E','F','G','A','B'];
  ca_names text[] := array['DO','RE','MI','FA','SOL','LA','SI'];
  bottom_idx integer;
  letter_idx integer;
  answer_name text;
begin
  if p_date is null then raise exception 'DATE_REQUIRED'; end if;

  raw := decode(md5(to_char(p_date,'YYYY-MM-DD') || '|BANDA_DE_LA_CALA|QUINA_NOTA_ES|v1'),'hex');
  clef_index := mod(get_byte(raw,0),3);

  if clef_index=0 then
    clef_id := 'treble'; bottom_letter := 'E'; min_step := -3; max_step := 12; accidental_threshold := 199; -- ~78%
  elsif clef_index=1 then
    clef_id := 'bass'; bottom_letter := 'G'; min_step := -2; max_step := 10; accidental_threshold := 92; -- ~36%
  else
    clef_id := 'alto'; bottom_letter := 'F'; min_step := -2; max_step := 10; accidental_threshold := 92; -- ~36%
  end if;

  step_value := min_step + mod(get_byte(raw,1), (max_step-min_step+1));
  if get_byte(raw,2) < accidental_threshold then
    accidental := case when mod(get_byte(raw,3),2)=0 then 'sharp' else 'flat' end;
  else
    accidental := 'none';
  end if;

  bottom_idx := array_position(letters,bottom_letter);
  idx := mod((bottom_idx - 1) + step_value,7);
  if idx < 0 then idx := idx + 7; end if;
  letter_idx := idx + 1;
  answer_name := ca_names[letter_idx];

  return jsonb_build_object(
    'date',to_char(p_date,'YYYY-MM-DD'),
    'clef',clef_id,
    'step',step_value,
    'accidental',accidental,
    'answer',answer_name
  );
end;
$$;

revoke all on function public.quina_nota_challenge_for_date(date) from public;
revoke all on function public.quina_nota_challenge_for_date(date) from anon;
revoke all on function public.quina_nota_challenge_for_date(date) from authenticated;
grant execute on function public.quina_nota_challenge_for_date(date) to service_role;

-- Repte públic: permet jugar sense login, però no revela la resposta ni desa res.
create or replace function public.get_quina_nota_public_challenge()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cycle_date date := public.quina_nota_cycle_date();
  ch jsonb;
begin
  ch := public.quina_nota_challenge_for_date(cycle_date);
  return jsonb_build_object(
    'date',to_char(cycle_date,'YYYY-MM-DD'),
    'challenge',(ch - 'answer'),
    'alreadyPlayed',false,
    'correct',null,
    'correctAnswer',null,
    'pointsTotal',0,
    'resetHour','03:00',
    'timeZone','Europe/Madrid'
  );
end;
$$;

revoke all on function public.get_quina_nota_public_challenge() from public;
grant execute on function public.get_quina_nota_public_challenge() to anon;
grant execute on function public.get_quina_nota_public_challenge() to authenticated;

-- Estat privat del USER registrat.
create or replace function public.get_quina_nota_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cycle_date date := public.quina_nota_cycle_date();
  p public.profiles%rowtype;
  ch jsonb;
  played boolean;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into p from public.profiles where user_id=uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  ch := public.quina_nota_challenge_for_date(cycle_date);
  played := (p.quina_nota_last_played_date = cycle_date);

  return jsonb_build_object(
    'date',to_char(cycle_date,'YYYY-MM-DD'),
    'challenge',(ch - 'answer'),
    'alreadyPlayed',played,
    'correct',case when played then p.quina_nota_last_result_correct else null end,
    'correctAnswer',case when played then ch->>'answer' else null end,
    'pointsTotal',coalesce(p.quina_nota_points_total,0),
    'resetHour','03:00',
    'timeZone','Europe/Madrid'
  );
end;
$$;

revoke all on function public.get_quina_nota_state() from public;
revoke all on function public.get_quina_nota_state() from anon;
grant execute on function public.get_quina_nota_state() to authenticated;

-- Únic intent puntuable per cicle i USER. Dues pestanyes no poden duplicar el punt.
create or replace function public.submit_quina_nota_answer(p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cycle_date date := public.quina_nota_cycle_date();
  answer_clean text := upper(btrim(coalesce(p_answer,'')));
  p public.profiles%rowtype;
  ch jsonb;
  expected text;
  is_correct boolean;
  awarded integer := 0;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if answer_clean not in ('DO','RE','MI','FA','SOL','LA','SI') then raise exception 'INVALID_NOTE'; end if;

  select * into p from public.profiles where user_id=uid for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  ch := public.quina_nota_challenge_for_date(cycle_date);
  expected := ch->>'answer';

  if p.quina_nota_last_played_date = cycle_date then
    return jsonb_build_object(
      'date',to_char(cycle_date,'YYYY-MM-DD'),
      'alreadyPlayed',true,
      'correct',p.quina_nota_last_result_correct,
      'correctAnswer',expected,
      'pointsAwarded',0,
      'pointsTotal',coalesce(p.quina_nota_points_total,0),
      'resetHour','03:00'
    );
  end if;

  is_correct := (answer_clean = expected);
  awarded := case when is_correct then 1 else 0 end;

  update public.profiles
  set quina_nota_last_played_date=cycle_date,
      quina_nota_last_result_correct=is_correct,
      quina_nota_points_total=coalesce(quina_nota_points_total,0)+awarded
  where user_id=uid
  returning * into p;

  return jsonb_build_object(
    'date',to_char(cycle_date,'YYYY-MM-DD'),
    'alreadyPlayed',true,
    'correct',is_correct,
    'correctAnswer',expected,
    'pointsAwarded',awarded,
    'pointsTotal',coalesce(p.quina_nota_points_total,0),
    'resetHour','03:00'
  );
end;
$$;

revoke all on function public.submit_quina_nota_answer(text) from public;
revoke all on function public.submit_quina_nota_answer(text) from anon;
grant execute on function public.submit_quina_nota_answer(text) to authenticated;

commit;
