create index analytics_events_installation_user_idx
  on public.analytics_events(installation_id, user_id);

create index care_snapshots_updated_by_user_idx
  on public.care_snapshots(updated_by_user_id);
