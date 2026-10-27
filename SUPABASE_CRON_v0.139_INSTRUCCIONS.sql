-- EXECUTAR DESPRÉS de desplegar la funció i crear el secret PUSH_CRON_SECRET.
-- Substituir el literal REEMPLACA_AMB_SECRET_LARG per un secret aleatori (el MATEIX a Edge Function secrets).
-- Aquest SQL emmagatzema el secret a Supabase Vault, no al repositori GitHub.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Supabase Vault viene habitualmente preinstalado; comprobar que existe vault.create_secret.
select vault.create_secret('REEMPLACA_AMB_SECRET_LARG','banda_push_cron_v0139','Clau privada del cron BANDA');
select cron.schedule('banda-push-reminders-v0139','*/5 * * * *',$$
  select net.http_post(
    url:='https://ighgvbnsratlektiwrjf.supabase.co/functions/v1/send-push-notification',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='banda_push_cron_v0139' limit 1)),
    body:='{"mode":"cron"}'::jsonb,
    timeout_milliseconds:=20000
  );
$$);
-- Si la funció canvia de nom o URL, cal actualitzar aquest cron.
