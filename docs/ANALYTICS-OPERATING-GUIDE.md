# PawPair analytics operating guide

## Connection

- Supabase project: `PawPair`
- Project ref: `bmtemofvyrnqrhiefvqp`
- Region: `eu-central-1`
- Repository connection: `.mcp.json`
- App endpoint and publishable key: `.env.local`
- Never use a service-role key in the app or commit one to the repository.

The local SQLite database remains the source of truth for pet-care data. Supabase receives only consented anonymous product analytics and future explicitly synchronized account data.

## Consent boundary

- Analytics is off by default.
- Consent can be enabled during onboarding or in Settings.
- Allowlisted events never include pet names, breeds, care notes, health records, attachments, veterinarian details, contact details or free text.
- Turning analytics off deletes the installation and its analytics events from the cloud project.

## Private dashboard views

The views live in the non-exposed `private` schema and are not granted to `anon` or `authenticated` roles.

- `private.analytics_daily_metrics`: events, users, installations and sessions by day, platform, version and event.
- `private.analytics_activation_funnel`: onboarding start, completion, pet creation, paywall view and purchase by day.
- `private.analytics_paywall_funnel`: paywall, plan selection, purchase start, completion, failure, restore and conversion rate.
- `private.analytics_retention_cohorts`: cohort size and D1, D7 and D30 retention.
- `private.analytics_feature_adoption`: care, health, notifications, backup and pet-feature adoption by release.

## Standard weekly queries

```sql
select *
from private.analytics_activation_funnel
order by day desc
limit 30;
```

```sql
select *
from private.analytics_paywall_funnel
order by day desc, platform, app_version
limit 100;
```

```sql
select *
from private.analytics_retention_cohorts
order by cohort_day desc
limit 90;
```

```sql
select *
from private.analytics_feature_adoption
where day >= now() - interval '30 days'
order by day desc, event_name;
```

Run these through the Supabase MCP `execute_sql` tool against project `bmtemofvyrnqrhiefvqp`. Revenue, trial conversion, refunds and paid retention remain authoritative in RevenueCat and App Store Connect Analytics; do not infer revenue from client events alone.

## Scale limits

The current Supabase Free plan is appropriate for launch validation, not guaranteed long-term production scale. Monitor monthly active users, database size, egress and project activity. Upgrade before sustained traffic approaches the plan limits, and enable production backup and recovery appropriate to the value of synchronized data before cloud pet-care sync is released.
