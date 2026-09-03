# PawPair database and analytics

## Permanent project identity

- Supabase project: `PawPair`
- Project ref: `bmtemofvyrnqrhiefvqp`
- Region: `eu-central-1`
- API URL: `https://bmtemofvyrnqrhiefvqp.supabase.co`
- MCP URL: `https://mcp.supabase.com/mcp?project_ref=bmtemofvyrnqrhiefvqp&features=database,docs`

The repository-level `.mcp.json` scopes AI database access to PawPair. Do not
remove `project_ref`; an unscoped connector can see unrelated Supabase projects.

## Sources of truth

- iOS/iPadOS: `pawpair.v1.db` through `expo-sqlite` is the offline source of truth.
- Web development: AsyncStorage is the care-state backend.
- Supabase: authenticated cloud backup, household sharing, sync and consented
  product analytics.
- RevenueCat: subscription entitlement and revenue analytics.

The app must write locally first. Cloud sync can fail without blocking care
logging, reminders or health-history access.

## Cloud tables

- `profiles`: one private profile per Supabase Auth user.
- `households`: top-level sharing boundary.
- `household_members`: owner, caregiver and viewer memberships.
- `care_snapshots`: versioned household snapshots for the first sync release.
- `installations`: consented app installations only.
- `analytics_events`: append-only, allowlisted product events.

All public tables have RLS. The mobile app uses only the publishable key. Never
put a secret key or service-role key in Expo, EAS environment variables exposed
to the client, source control or `.mcp.json`.

## Analytics privacy contract

Analytics is off by default. `AnalyticsBootstrap` sends nothing until
`setAnalyticsConsent(true)` has been called from a clear onboarding or Settings
choice. Revoking consent deletes the current installation and its events.

Never add these values to analytics properties:

- Pet or caregiver names
- Breed
- Medication, dosage, symptoms, diagnosis or notes
- Email, phone or address
- Attachment paths, file URIs or care/health payloads

The database rejects those property keys and limits each event payload to 4 KB.
Before enabling the consent UI in a release, update the public Privacy Policy
and App Store Privacy Nutrition Label for product interaction and identifiers.

## Core metrics

Query daily event metrics:

```sql
select *
from private.analytics_daily_metrics
order by day desc, event_name;
```

Query activation and monetization funnel:

```sql
select *
from private.analytics_activation_funnel
order by day desc;
```

Recommended launch dashboard:

- Onboarding completion: `onboarding_completed / onboarding_started`
- First value: `pet_profile_created / onboarding_started`
- D1, D7 and D30 return rate from `app_open`
- Care activation: users with `care_item_completed`
- Paywall conversion: `purchase_completed / paywall_viewed`
- Restore and purchase failure rate

## Capacity and launch gate

Free is suitable for development only. Current Free limits include two active
projects, 500 MB database per project, 50,000 MAU, 5 GB egress and no automatic
backups. Free projects pause after one week without activity.

Before production launch:

1. Upgrade the PawPair organization to Pro.
2. Enable and verify anonymous Auth only for users who consent to analytics, or
   replace it with the final Sign in with Apple flow.
3. Add the designed analytics consent choice to onboarding and Settings.
4. Add the publishable environment variables to the EAS production profile.
5. Exercise RLS with two test users and verify cross-household denial.
6. Configure retention or export raw events before the analytics table grows.
7. Update Apple privacy disclosures before collecting the first event.
