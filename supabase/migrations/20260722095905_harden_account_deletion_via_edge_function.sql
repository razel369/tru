drop function if exists public.delete_my_account();

create or replace function public.delete_account_by_id(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'A user id is required'
      using errcode = '22004';
  end if;

  delete from public.households
  where owner_user_id = target_user_id;

  update public.care_snapshots as snapshot
  set
    updated_by_user_id = household.owner_user_id,
    updated_at = now()
  from public.households as household
  where snapshot.household_id = household.id
    and snapshot.updated_by_user_id = target_user_id;

  delete from public.household_members
  where user_id = target_user_id;

  delete from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'The account no longer exists'
      using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.delete_account_by_id(uuid) is
  'Deletes one PawPair account. Callable only by the service role through the authenticated delete-account Edge Function.';

revoke all on function public.delete_account_by_id(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_account_by_id(uuid) to service_role;
