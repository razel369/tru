-- Anonymous PawPair accounts exist only for optional product analytics.
-- Keep future care-sync tables available to permanent authenticated users
-- while preventing disposable anonymous accounts from filling them.

create policy profiles_reject_anonymous
on public.profiles
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

create policy households_reject_anonymous
on public.households
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

create policy household_members_reject_anonymous
on public.household_members
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);

create policy care_snapshots_reject_anonymous
on public.care_snapshots
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false);
