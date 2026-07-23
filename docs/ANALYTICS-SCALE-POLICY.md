# Analytics scale policy

PawPair uses an explicit opt-in, anonymous product analytics pipeline in Supabase.
Pet names, breeds, care notes, medication details, health records, attachments, and
free-text fields are never analytics properties.

## Current Supabase limits

The PawPair project is currently on Supabase Free:

- 50,000 monthly active users
- 500 MB database size
- 5 GB uncached egress and 5 GB cached egress
- 1 GB file storage
- projects can pause after one week of inactivity

Official references:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users
- https://supabase.com/docs/guides/platform/database-size
- https://supabase.com/docs/guides/platform/manage-your-usage/egress

## Retention design

- Raw analytics events are retained for 45 full UTC days.
- A nightly Supabase Cron job rolls completed UTC days into
  `private.analytics_daily_rollups`.
- The same job deletes only full UTC days older than the raw retention window.
- Daily rollups contain event name, platform, app version, counts, and distinct
  anonymous identifiers. They do not contain event properties or pet data.
- D1, D7, and D30 analysis uses the recent raw window.
- Long-term acquisition, activation, paywall, purchase, and feature trends use
  daily rollups.
- App Store Connect and RevenueCat remain the source of truth for revenue,
  trials, renewals, refunds, and subscription status.

## Operating queries

Run with the PawPair-scoped Supabase MCP connection.

```sql
select * from private.analytics_storage_health;
```

```sql
select *
from private.analytics_daily_rollups
where day >= current_date - 90
order by day desc, event_name, platform;
```

```sql
select *
from private.analytics_retention_cohorts
order by cohort_date desc;
```

## Upgrade gates

Upgrade to Supabase Pro before any of these conditions:

- public launch is approved in App Store Connect
- database budget reaches 60 percent
- uncached egress reaches 60 percent of the monthly quota
- the app approaches 10,000 monthly active users
- automatic daily backups are required for production operations

At 80 percent database or egress usage, stop nonessential event collection until
the project is upgraded. Do not silently drop purchase events; revenue data still
exists in RevenueCat and App Store Connect.
