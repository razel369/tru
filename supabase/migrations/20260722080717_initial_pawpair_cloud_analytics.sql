create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analytics_consent_at timestamptz,
  deleted_at timestamptz
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index households_owner_user_id_idx on public.households(owner_user_id);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'caregiver', 'viewer')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (household_id, user_id)
);
create index household_members_user_id_idx on public.household_members(user_id, household_id);

create table public.care_snapshots (
  household_id uuid primary key references public.households(id) on delete cascade,
  data_version integer not null check (data_version > 0),
  client_revision bigint not null default 1 check (client_revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_checksum text not null check (char_length(payload_checksum) between 16 and 128),
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_snapshots_updated_at_idx on public.care_snapshots(updated_at desc);

create table public.installations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'ipad', 'web')),
  app_version text not null check (char_length(app_version) between 1 and 32),
  locale text check (locale is null or char_length(locale) <= 32),
  timezone text check (timezone is null or char_length(timezone) <= 64),
  analytics_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (id, user_id)
);
create index installations_user_id_idx on public.installations(user_id);

create table private.analytics_event_catalog (
  event_name text primary key check (event_name ~ '^[a-z][a-z0-9_]{1,63}$'),
  category text not null check (category in ('activation', 'engagement', 'retention', 'monetization', 'reliability')),
  description text not null,
  created_at timestamptz not null default now()
);

insert into private.analytics_event_catalog(event_name, category, description) values
  ('app_open', 'retention', 'A consented installation opened PawPair'),
  ('screen_view', 'engagement', 'A named application screen became active'),
  ('onboarding_started', 'activation', 'The personalized onboarding flow started'),
  ('onboarding_completed', 'activation', 'The personalized onboarding flow completed'),
  ('pet_profile_created', 'activation', 'A pet profile was created without pet attributes'),
  ('pet_switched', 'engagement', 'The active pet changed without pet attributes'),
  ('care_item_created', 'engagement', 'A care item was created without care content'),
  ('care_item_completed', 'engagement', 'A care item was completed without care content'),
  ('health_record_created', 'engagement', 'A health record was created without health content'),
  ('notification_prompted', 'activation', 'The system notification permission prompt was requested'),
  ('notification_granted', 'activation', 'Notification permission was granted'),
  ('notification_denied', 'activation', 'Notification permission was denied'),
  ('paywall_viewed', 'monetization', 'The Premium paywall was viewed'),
  ('plan_selected', 'monetization', 'A billing period was selected'),
  ('purchase_started', 'monetization', 'An App Store purchase flow started'),
  ('purchase_completed', 'monetization', 'A purchase completed'),
  ('purchase_failed', 'reliability', 'A purchase failed using a normalized reason'),
  ('restore_completed', 'monetization', 'Restore purchases completed'),
  ('backup_created', 'engagement', 'An encrypted backup was created'),
  ('backup_restored', 'engagement', 'An encrypted backup was restored'),
  ('app_error', 'reliability', 'A normalized non-sensitive application error occurred');

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  session_id uuid not null,
  event_name text not null references private.analytics_event_catalog(event_name),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text not null check (char_length(app_version) between 1 and 32),
  platform text not null check (platform in ('ios', 'ipad', 'web')),
  properties jsonb not null default '{}'::jsonb,
  constraint analytics_events_installation_fk
    foreign key (installation_id, user_id)
    references public.installations(id, user_id)
    on delete cascade,
  constraint analytics_properties_object
    check (jsonb_typeof(properties) = 'object'),
  constraint analytics_properties_size
    check (octet_length(properties::text) <= 4096),
  constraint analytics_properties_no_sensitive_keys
    check (
      not (properties ?| array[
        'pet_name', 'name', 'breed', 'medication', 'dosage', 'symptom',
        'diagnosis', 'note', 'email', 'phone', 'address', 'attachment',
        'file_uri', 'care_payload', 'health_payload'
      ])
    )
);
create index analytics_events_received_brin_idx
  on public.analytics_events using brin(received_at);
create index analytics_events_name_received_idx
  on public.analytics_events(event_name, received_at desc);
create index analytics_events_user_received_idx
  on public.analytics_events(user_id, received_at desc);
create index analytics_events_installation_received_idx
  on public.analytics_events(installation_id, received_at desc);

create view private.analytics_daily_metrics
with (security_invoker = true)
as
select
  date_trunc('day', received_at) as day,
  event_name,
  platform,
  app_version,
  count(*)::bigint as event_count,
  count(distinct user_id)::bigint as unique_users,
  count(distinct installation_id)::bigint as unique_installations,
  count(distinct session_id)::bigint as unique_sessions
from public.analytics_events
group by 1, 2, 3, 4;

create view private.analytics_activation_funnel
with (security_invoker = true)
as
select
  date_trunc('day', received_at) as day,
  count(distinct user_id) filter (where event_name = 'onboarding_started')::bigint as onboarding_started,
  count(distinct user_id) filter (where event_name = 'onboarding_completed')::bigint as onboarding_completed,
  count(distinct user_id) filter (where event_name = 'pet_profile_created')::bigint as pet_profiles_created,
  count(distinct user_id) filter (where event_name = 'paywall_viewed')::bigint as paywall_viewers,
  count(distinct user_id) filter (where event_name = 'purchase_completed')::bigint as purchasers
from public.analytics_events
group by 1;

create or replace function private.household_role(target_household_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select hm.role
  from public.household_members hm
  where hm.household_id = target_household_id
    and hm.user_id = (select auth.uid())
    and hm.removed_at is null
  limit 1;
$$;
revoke all on function private.household_role(uuid) from public, anon;
grant execute on function private.household_role(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.add_household_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.household_members(household_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner');
  return new;
end;
$$;
revoke all on function private.add_household_owner() from public, anon, authenticated;

create trigger on_household_created
after insert on public.households
for each row execute function private.add_household_owner();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row execute function private.set_updated_at();

create trigger care_snapshots_set_updated_at
before update on public.care_snapshots
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.care_snapshots enable row level security;
alter table public.installations enable row level security;
alter table public.analytics_events enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_delete_own
on public.profiles for delete to authenticated
using (id = (select auth.uid()));

create policy households_select_member
on public.households for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or (select private.household_role(id)) is not null
);

create policy households_insert_owner
on public.households for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy households_update_owner
on public.households for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy households_delete_owner
on public.households for delete to authenticated
using (owner_user_id = (select auth.uid()));

create policy household_members_select_member
on public.household_members for select to authenticated
using ((select private.household_role(household_id)) is not null);

create policy household_members_insert_owner
on public.household_members for insert to authenticated
with check ((select private.household_role(household_id)) = 'owner');

create policy household_members_update_owner
on public.household_members for update to authenticated
using ((select private.household_role(household_id)) = 'owner')
with check ((select private.household_role(household_id)) = 'owner');

create policy household_members_delete_owner
on public.household_members for delete to authenticated
using (
  (select private.household_role(household_id)) = 'owner'
  and user_id <> (select auth.uid())
);

create policy care_snapshots_select_member
on public.care_snapshots for select to authenticated
using ((select private.household_role(household_id)) is not null);

create policy care_snapshots_insert_editor
on public.care_snapshots for insert to authenticated
with check (
  updated_by_user_id = (select auth.uid())
  and (select private.household_role(household_id)) in ('owner', 'caregiver')
);

create policy care_snapshots_update_editor
on public.care_snapshots for update to authenticated
using ((select private.household_role(household_id)) in ('owner', 'caregiver'))
with check (
  updated_by_user_id = (select auth.uid())
  and (select private.household_role(household_id)) in ('owner', 'caregiver')
);

create policy care_snapshots_delete_owner
on public.care_snapshots for delete to authenticated
using ((select private.household_role(household_id)) = 'owner');

create policy installations_select_own
on public.installations for select to authenticated
using (user_id = (select auth.uid()));

create policy installations_insert_own
on public.installations for insert to authenticated
with check (
  user_id = (select auth.uid())
  and analytics_consent_at is not null
);

create policy installations_update_own
on public.installations for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and analytics_consent_at is not null
);

create policy installations_delete_own
on public.installations for delete to authenticated
using (user_id = (select auth.uid()));

create policy analytics_events_insert_own_consented
on public.analytics_events for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.installations i
    where i.id = installation_id
      and i.user_id = (select auth.uid())
      and i.analytics_consent_at is not null
  )
);

revoke all on all tables in schema public from anon;
revoke all on public.profiles, public.households, public.household_members,
  public.care_snapshots, public.installations, public.analytics_events
  from authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;
grant select, insert, update, delete on public.care_snapshots to authenticated;
grant select, insert, update, delete on public.installations to authenticated;
grant insert on public.analytics_events to authenticated;
