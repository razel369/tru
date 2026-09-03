create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required to delete an account'
      using errcode = '42501';
  end if;

  delete from public.households
  where owner_user_id = current_user_id;

  update public.care_snapshots as snapshot
  set
    updated_by_user_id = household.owner_user_id,
    updated_at = now()
  from public.households as household
  where snapshot.household_id = household.id
    and snapshot.updated_by_user_id = current_user_id;

  delete from public.household_members
  where user_id = current_user_id;

  delete from auth.users
  where id = current_user_id;

  if not found then
    raise exception 'The authenticated account no longer exists'
      using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.delete_my_account() is
  'Permanently deletes the authenticated PawPair account and owned cloud data.';

revoke all on function public.delete_my_account() from public, anon, authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;
