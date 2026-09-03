-- PawPair analytics retention and scale policy.
-- Keeps raw product events for 45 full UTC days and durable daily aggregates.
-- Revenue remains authoritative in App Store Connect and RevenueCat.

create extension if not exists pg_cron;

create table if not exists private.analytics_daily_rollups (
  day date not null,
  event_name text not null references private.analytics_event_catalog(event_name) on update cascade,
  platform text not null check (platform in ('ios', 'ipad', 'web')),
  app_version text not null,
  event_count bigint not null check (event_count >= 0),
  unique_installations bigint not null check (unique_installations >= 0),
  unique_users bigint not null check (unique_users >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, event_name, platform, app_version)
);
revoke all on table private.analytics_daily_rollups from public, anon, authenticated;

create or replace function private.rollup_and_prune_analytics_events(
  retention_days integer default 45
)
returns table (rolled_up_rows bigint, deleted_raw_rows bigint)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_rolled_up_rows bigint := 0;
  v_deleted_raw_rows bigint := 0;
begin
  if retention_days < 31 or retention_days > 365 then
    raise exception 'retention_days must be between 31 and 365';
  end if;

  insert into private.analytics_daily_rollups (
    day,
    event_name,
    platform,
    app_version,
    event_count,
    unique_installations,
    unique_users,
    updated_at
  )
  select
    (occurred_at at time zone 'UTC')::date,
    event_name,
    platform,
    app_version,
    count(*)::bigint,
    count(distinct installation_id)::bigint,
    count(distinct user_id)::bigint,
    now()
  from public.analytics_events
  where occurred_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  group by 1, 2, 3, 4
  on conflict (day, event_name, platform, app_version)
  do update set
    event_count = excluded.event_count,
    unique_installations = excluded.unique_installations,
    unique_users = excluded.unique_users,
    updated_at = now();

  get diagnostics v_rolled_up_rows = row_count;

  delete from public.analytics_events
  where occurred_at <
    (date_trunc('day', now() at time zone 'UTC') - make_interval(days => retention_days))
      at time zone 'UTC';

  get diagnostics v_deleted_raw_rows = row_count;

  return query select v_rolled_up_rows, v_deleted_raw_rows;
end;
$function$;

revoke all on function private.rollup_and_prune_analytics_events(integer)
  from public, anon, authenticated;

create or replace view private.analytics_storage_health
with (security_invoker = true)
as
select
  now() as checked_at,
  count(*)::bigint as raw_event_rows,
  min(occurred_at) as oldest_raw_event_at,
  max(occurred_at) as newest_raw_event_at,
  pg_total_relation_size('public.analytics_events'::regclass)::bigint as raw_event_bytes,
  pg_database_size(current_database())::bigint as database_bytes,
  round(
    pg_database_size(current_database())::numeric
      / (500 * 1024 * 1024)::numeric * 100,
    2
  ) as free_plan_database_budget_percent
from public.analytics_events;

revoke all on table private.analytics_storage_health from public, anon, authenticated;

do $block$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'pawpair-analytics-rollup'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$block$;

select cron.schedule(
  'pawpair-analytics-rollup',
  '17 3 * * *',
  'select private.rollup_and_prune_analytics_events(45);'
);
