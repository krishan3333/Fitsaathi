-- Joining a Fit Circle by invite code was broken: `circles_select_member`
-- only lets you SELECT a circle you're already a member of (or created) —
-- but looking a circle up by its code is exactly what a non-member needs to
-- do *before* joining. The client's lookup query always returned zero rows,
-- so "join by code" failed with "No Fit Circle found with that code" even
-- for a real, valid code. Verified live: a real invite code returned 0 rows
-- for a non-member before this fix.
--
-- Fix: a SECURITY DEFINER RPC that looks the circle up (bypassing RLS just
-- for this one lookup) and adds the caller as a member — without loosening
-- the general SELECT policy, so circles still can't be browsed/enumerated
-- by anyone who isn't already in one.

create or replace function join_circle_by_code(p_invite_code text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  target fit_circles%rowtype;
begin
  select * into target from fit_circles where invite_code = upper(trim(p_invite_code));
  if target.id is null then
    raise exception 'No Fit Circle found with that code.';
  end if;

  insert into circle_members (circle_id, profile_id) values (target.id, auth.uid())
  on conflict do nothing;

  return query select target.id, target.name;
end;
$$;

grant execute on function join_circle_by_code(text) to authenticated;
