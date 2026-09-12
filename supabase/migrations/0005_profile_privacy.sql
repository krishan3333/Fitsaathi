-- Tighten profile visibility.
--
-- Until now any signed-in student could read every column of every other
-- profile (needed for leaderboards, but it also exposed free_slots — a
-- student's full timetable — plus fitness goals and low-impact flags).
--
-- RLS is row-level and can't hide individual columns, so instead:
--   * profiles itself becomes own-row-only
--   * a curated `public_profiles` view exposes just the fields other students
--     legitimately need to see (leaderboards, circle member lists)
--   * "friends free right now" moves into an RPC that returns a count only,
--     so nobody's timetable is ever sent to another student's browser.

-- 1. profiles: own row only.
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_own" on profiles for select to authenticated
  using (id = auth.uid());

-- 2. Curated public view. Runs with the view owner's rights (security_invoker
--    off) so it can read past the restrictive policy above, while only ever
--    selecting non-sensitive columns.
create or replace view public_profiles
with (security_invoker = off) as
  select
    id,
    name,
    nickname,
    use_nickname,
    avatar_url,
    college,
    department,
    level,
    current_streak,
    hide_steps
  from profiles;

revoke all on public_profiles from anon;
grant select on public_profiles to authenticated;

-- 3. Availability without exposing timetables: how many of my circle-mates have
--    a free slot covering this exact moment.
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
  )
  select count(*)::int
  from mates m
  join profiles p on p.id = m.profile_id
  where exists (
    select 1
    from jsonb_array_elements(p.free_slots) slot
    where slot->>'day' = to_char(now(), 'Dy')
      and (slot->>'start') <= to_char(now(), 'HH24:MI')
      and (slot->>'end') >= to_char(now(), 'HH24:MI')
  );
$$;

grant execute on function friends_available_now() to authenticated;
