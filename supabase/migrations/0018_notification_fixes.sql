-- Step 0 bug fixes.
--
-- 1. Invites and emoji reactions never arrived: notifications_insert_self
--    (0001_init.sql) only allows profile_id = auth.uid(), but
--    invite-friends-dialog.tsx and emoji-react-button.tsx insert rows for
--    *other* users. RLS silently rejected them and the UI showed "sent"
--    anyway. Fix: a SECURITY DEFINER RPC that inserts on the caller's behalf,
--    scoped to their own circle-mates so a client still can't spam arbitrary
--    profiles. Pattern: coordinator_broadcast_announcement (0004).
--
-- 2. Free-slot matching was UTC-only (lib/quest-context.ts used server-local
--    time, friends_available_now used now()). Students enter slots in IST, so
--    once deployed to Vercel (UTC) everything was off by 5h30. Recreate
--    friends_available_now against Asia/Kolkata wall-clock time; lib/time.ts
--    (application code) mirrors this for quest-context.ts.

alter table notifications add column link text;

-- "Circle mates" here means the same reachability the app already grants for
-- reading someone else's activities (0001_init.sql activities_select_own_or_shared):
-- a fellow Fit Circle member, or a fellow participant in any challenge the
-- caller is also in. Needed because emoji-react-button.tsx fires on official
-- (college-wide, circle_id null) challenge leaderboards too, not just circles.
create or replace function notify_circle_mates(
  p_profile_ids uuid[],
  p_title text,
  p_body text,
  p_type text,
  p_link text default null
)
returns int language plpgsql security definer set search_path = public as $$
declare
  inserted int;
begin
  with mates as (
    select distinct cm.profile_id
    from circle_members cm
    join circle_members mine on mine.circle_id = cm.circle_id
    where mine.profile_id = auth.uid() and cm.profile_id <> auth.uid()
    union
    select distinct cp.profile_id
    from challenge_participants cp
    join challenge_participants mine on mine.challenge_id = cp.challenge_id
    where mine.profile_id = auth.uid() and cp.profile_id <> auth.uid()
  )
  insert into notifications (profile_id, title, body, type, link)
  select mates.profile_id, p_title, p_body, p_type, p_link
  from mates
  where mates.profile_id = any(p_profile_ids);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function notify_circle_mates(uuid[], text, text, text, text) to authenticated;

create or replace function friends_available_now()
returns int language sql stable security definer set search_path = public as $$
  with my_circles as (
    select circle_id from circle_members where profile_id = auth.uid()
  ),
  mates as (
    select distinct cm.profile_id
    from circle_members cm
    join my_circles mc on mc.circle_id = cm.circle_id
    where cm.profile_id <> auth.uid()
  ),
  ist_now as (
    select now() at time zone 'Asia/Kolkata' as clock
  )
  select count(*)::int
  from mates m
  join profiles p on p.id = m.profile_id
  cross join ist_now
  where exists (
    select 1
    from jsonb_array_elements(p.free_slots) slot
    where slot->>'day' = to_char(ist_now.clock, 'Dy')
      and (slot->>'start') <= to_char(ist_now.clock, 'HH24:MI')
      and (slot->>'end') >= to_char(ist_now.clock, 'HH24:MI')
  );
$$;

grant execute on function friends_available_now() to authenticated;
