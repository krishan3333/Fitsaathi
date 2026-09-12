-- The coordinator dashboard's aggregate RPCs had no college filter at all —
-- a coordinator at any college saw stats blended across every college's
-- students. Scope everything to the coordinator's own college.

create or replace function coordinator_overview()
returns table (
  active_students_week int,
  total_campus_steps bigint,
  most_active_department text,
  most_popular_route text,
  most_active_hour int
) language sql stable security definer set search_path = public as $$
  with my_college as (select college from profiles where id = auth.uid())
  select
    (select count(distinct a.profile_id)::int
      from activities a join profiles p on p.id = a.profile_id
      where a.occurred_on >= current_date - interval '7 days' and p.college = (select college from my_college)),
    (select coalesce(sum(a.steps), 0)::bigint
      from activities a join profiles p on p.id = a.profile_id
      where a.occurred_on >= current_date - interval '7 days' and p.college = (select college from my_college)),
    (select p.department from activities a join profiles p on p.id = a.profile_id
      where a.occurred_on >= current_date - interval '7 days' and p.department <> '' and p.college = (select college from my_college)
      group by p.department order by sum(a.steps) desc limit 1),
    (select r.name from routes r
      join campus_locations cl on cl.id = r.location_id
      join route_checkins rc on rc.location_id = r.location_id
      where cl.college = (select college from my_college)
      group by r.name order by count(*) desc limit 1),
    (select extract(hour from a.created_at)::int
      from activities a join profiles p on p.id = a.profile_id
      where a.occurred_on >= current_date - interval '7 days' and p.college = (select college from my_college)
      group by 1 order by count(*) desc limit 1)
  where is_coordinator();
$$;

create or replace function coordinator_department_leaderboard()
returns table (department text, total_steps bigint, active_students int)
language sql stable security definer set search_path = public as $$
  select p.department, coalesce(sum(a.steps), 0)::bigint as total_steps, count(distinct p.id)::int as active_students
  from profiles p
  left join activities a on a.profile_id = p.id and a.occurred_on >= current_date - interval '7 days'
  where is_coordinator() and p.department <> '' and p.college = (select college from profiles where id = auth.uid())
  group by p.department
  order by total_steps desc;
$$;

create or replace function coordinator_route_usage()
returns table (route_name text, checkins int)
language sql stable security definer set search_path = public as $$
  select r.name as route_name, count(rc.id)::int as checkins
  from routes r
  join campus_locations cl on cl.id = r.location_id
  left join route_checkins rc on rc.location_id = r.location_id
  where is_coordinator() and cl.college = (select college from profiles where id = auth.uid())
  group by r.name
  order by checkins desc;
$$;
