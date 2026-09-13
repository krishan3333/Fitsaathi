-- Joining a Fit Circle by invite code left you a circle member but not a
-- participant in any of that circle's already-running challenges — you had
-- to separately find and tap "Join" on each one. Auto-join every currently
-- active challenge in the circle as part of the same join step.

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

  insert into challenge_participants (challenge_id, profile_id)
  select c.id, auth.uid()
  from challenges c
  where c.circle_id = target.id and c.end_date >= current_date
  on conflict do nothing;

  return query select target.id, target.name;
end;
$$;
