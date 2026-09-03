-- PawPair anonymous-auth hygiene.
-- Removes accounts that have had no consented installation for at least
-- 30 days. Active analytics identities are never selected.

create or replace function private.cleanup_abandoned_anonymous_users(
  grace_days integer default 30
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  deleted_users bigint := 0;
begin
  if grace_days < 30 or grace_days > 365 then
    raise exception 'grace_days must be between 30 and 365';
  end if;

  with deleted as (
    delete from auth.users as account
    where account.is_anonymous is true
      and account.created_at < now() - make_interval(days => grace_days)
      and not exists (
        select 1
        from public.installations as installation
        where installation.user_id = account.id
      )
    returning account.id
  )
  select count(*)::bigint into deleted_users from deleted;

  return deleted_users;
end;
$function$;

comment on function private.cleanup_abandoned_anonymous_users(integer) is
  'Deletes PawPair anonymous users older than the grace period only when they have no active analytics installation.';

revoke all on function private.cleanup_abandoned_anonymous_users(integer)
  from public, anon, authenticated, service_role;

do $block$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'pawpair-anonymous-user-cleanup'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$block$;

select cron.schedule(
  'pawpair-anonymous-user-cleanup',
  '41 3 * * *',
  'select private.cleanup_abandoned_anonymous_users(30);'
);
