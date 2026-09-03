create or replace view private.analytics_paywall_funnel
with (security_invoker = true)
as
select
  date_trunc('day', received_at) as day,
  platform,
  app_version,
  count(distinct installation_id) filter (where event_name = 'paywall_viewed') as paywall_viewers,
  count(distinct installation_id) filter (where event_name = 'plan_selected') as plan_selectors,
  count(distinct installation_id) filter (where event_name = 'purchase_started') as purchase_starters,
  count(distinct installation_id) filter (where event_name = 'purchase_completed') as purchasers,
  count(distinct installation_id) filter (where event_name = 'purchase_failed') as purchase_failures,
  count(distinct installation_id) filter (where event_name = 'restore_completed') as restorers,
  round(
    100.0
    * count(distinct installation_id) filter (where event_name = 'purchase_completed')
    / nullif(count(distinct installation_id) filter (where event_name = 'paywall_viewed'), 0),
    2
  ) as paywall_to_purchase_percent
from public.analytics_events
group by date_trunc('day', received_at), platform, app_version;

create or replace view private.analytics_retention_cohorts
with (security_invoker = true)
as
with first_seen as (
  select
    installation_id,
    min(received_at)::date as cohort_day
  from public.analytics_events
  group by installation_id
),
activity as (
  select distinct
    installation_id,
    received_at::date as activity_day
  from public.analytics_events
)
select
  first_seen.cohort_day,
  count(distinct first_seen.installation_id) as cohort_size,
  count(distinct first_seen.installation_id)
    filter (where activity.activity_day = first_seen.cohort_day + 1) as retained_d1,
  count(distinct first_seen.installation_id)
    filter (where activity.activity_day = first_seen.cohort_day + 7) as retained_d7,
  count(distinct first_seen.installation_id)
    filter (where activity.activity_day = first_seen.cohort_day + 30) as retained_d30,
  round(
    100.0 * count(distinct first_seen.installation_id)
      filter (where activity.activity_day = first_seen.cohort_day + 1)
    / nullif(count(distinct first_seen.installation_id), 0),
    2
  ) as retained_d1_percent,
  round(
    100.0 * count(distinct first_seen.installation_id)
      filter (where activity.activity_day = first_seen.cohort_day + 7)
    / nullif(count(distinct first_seen.installation_id), 0),
    2
  ) as retained_d7_percent,
  round(
    100.0 * count(distinct first_seen.installation_id)
      filter (where activity.activity_day = first_seen.cohort_day + 30)
    / nullif(count(distinct first_seen.installation_id), 0),
    2
  ) as retained_d30_percent
from first_seen
left join activity using (installation_id)
group by first_seen.cohort_day;

create or replace view private.analytics_feature_adoption
with (security_invoker = true)
as
select
  date_trunc('day', received_at) as day,
  platform,
  app_version,
  event_name,
  count(*) as event_count,
  count(distinct installation_id) as unique_installations,
  count(distinct session_id) as unique_sessions
from public.analytics_events
where event_name in (
  'pet_profile_created',
  'pet_switched',
  'care_item_created',
  'care_item_completed',
  'health_record_created',
  'notification_prompted',
  'notification_granted',
  'backup_created',
  'backup_restored'
)
group by date_trunc('day', received_at), platform, app_version, event_name;

revoke all on private.analytics_paywall_funnel from public, anon, authenticated;
revoke all on private.analytics_retention_cohorts from public, anon, authenticated;
revoke all on private.analytics_feature_adoption from public, anon, authenticated;
