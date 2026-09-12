-- FitSaathi database schema + RLS
-- Run against a fresh Supabase project (SQL editor or `supabase db push`).

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  college text not null default '',
  department text not null default '',
  fitness_goal text check (fitness_goal in ('Stamina','Weight Management','Stress Relief','Flexibility','Sports Fitness')),
  fitness_level text check (fitness_level in ('Beginner','Intermediate','Advanced')),
  preferred_activities text[] not null default '{}',
  preferred_duration int check (preferred_duration in (5,10,15,30)),
  indoor_outdoor text check (indoor_outdoor in ('Indoor','Outdoor','Both')) default 'Both',
  free_slots jsonb not null default '[]', -- [{ "day": "Mon", "start": "17:00", "end": "18:00" }]
  preferred_language text not null default 'English',
  low_impact boolean not null default false,
  role text not null check (role in ('student','coordinator')) default 'student',
  avatar_url text,
  nickname text,
  hide_steps boolean not null default false,
  hide_location boolean not null default false,
  use_nickname boolean not null default false,
  notifications_enabled boolean not null default true,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  level text not null check (level in ('Beginner','Active','Consistent','Campus Champion')) default 'Beginner',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table fit_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references fit_circles(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (circle_id, profile_id)
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references fit_circles(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  type text not null check (type in (
    'daily_steps','weekly_steps','walking_distance','workout_minutes',
    'active_streak','cycling_distance','running_distance','team_steps',
    'department_vs_department','hostel_vs_hostel'
  )),
  goal_value numeric not null,
  unit text not null,
  start_date date not null default current_date,
  end_date date not null,
  is_official boolean not null default false,
  group_a text,
  group_b text,
  created_at timestamptz not null default now()
);

create table challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  group_label text,
  progress_value numeric not null default 0,
  joined_at timestamptz not null default now(),
  unique (challenge_id, profile_id)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('walk','run','cycle','workout','quest','gps_route')),
  steps int not null default 0,
  distance_km numeric not null default 0,
  active_minutes int not null default 0,
  source text not null check (source in ('manual','quest','gps_route')) default 'manual',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  duration_minutes int not null,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  location text not null,
  estimated_steps int not null default 0,
  points int not null default 0,
  indoor_outdoor text not null check (indoor_outdoor in ('Indoor','Outdoor')),
  quest_type text not null, -- tag used by lib/quest-engine.ts rule matching
  created_at timestamptz not null default now()
);

create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create table campus_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  activity_type text not null,
  lat double precision not null,
  lng double precision not null,
  distance_km numeric not null default 0,
  estimated_steps int not null default 0,
  crowd_level text not null check (crowd_level in ('Low','Medium','High')) default 'Low',
  safety_rating text not null check (safety_rating in ('Good','Fair','Poor')) default 'Good',
  has_water boolean not null default false,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  distance_km numeric not null default 0,
  path jsonb not null default '[]', -- [[lng,lat], ...]
  location_id uuid references campus_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table route_checkins (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references campus_locations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  crowd_level text not null check (crowd_level in ('Low','Medium','High')),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  icon text not null default 'award'
);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);

create index on activities (profile_id, occurred_on desc);
create index on challenge_participants (challenge_id);
create index on circle_members (profile_id);
create index on notifications (profile_id, created_at desc);

-- ============================================================================
-- HELPER FUNCTIONS (security definer to dodge RLS self-recursion)
-- ============================================================================

create or replace function is_coordinator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'coordinator');
$$;

create or replace function is_circle_member(target_circle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from circle_members
    where circle_id = target_circle and profile_id = auth.uid()
  );
$$;

create or replace function is_challenge_eligible(target_challenge uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    coalesce((select is_official from challenges where id = target_challenge), false)
    or exists (
      select 1 from challenge_participants
      where challenge_id = target_challenge and profile_id = auth.uid()
    )
    or exists (
      select 1 from challenges c
      where c.id = target_challenge and c.circle_id is not null and is_circle_member(c.circle_id)
    );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table fit_circles enable row level security;
alter table circle_members enable row level security;
alter table challenges enable row level security;
alter table challenge_participants enable row level security;
alter table activities enable row level security;
alter table quests enable row level security;
alter table quest_completions enable row level security;
alter table campus_locations enable row level security;
alter table routes enable row level security;
alter table route_checkins enable row level security;
alter table notifications enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;

-- profiles: app-wide directory (needed for leaderboards/circles); writes are self-only.
create policy "profiles_select_all" on profiles for select to authenticated using (true);
create policy "profiles_insert_self" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on profiles for update to authenticated using (id = auth.uid());

-- fit_circles / circle_members: members only.
create policy "circles_select_member" on fit_circles for select to authenticated
  using (is_circle_member(id) or created_by = auth.uid());
create policy "circles_insert_self" on fit_circles for insert to authenticated with check (created_by = auth.uid());

create policy "circle_members_select_member" on circle_members for select to authenticated
  using (is_circle_member(circle_id));
create policy "circle_members_insert_self" on circle_members for insert to authenticated
  with check (profile_id = auth.uid());
create policy "circle_members_delete_self" on circle_members for delete to authenticated
  using (profile_id = auth.uid());

-- challenges / participants: eligible participants only (official, own circle, or already joined).
create policy "challenges_select_eligible" on challenges for select to authenticated
  using (is_official or (circle_id is not null and is_circle_member(circle_id)));
create policy "challenges_insert_member" on challenges for insert to authenticated
  with check (created_by = auth.uid() and (circle_id is null and is_coordinator() or is_circle_member(circle_id)));

create policy "participants_select_eligible" on challenge_participants for select to authenticated
  using (is_challenge_eligible(challenge_id));
create policy "participants_insert_self" on challenge_participants for insert to authenticated
  with check (profile_id = auth.uid() and is_challenge_eligible(challenge_id));
create policy "participants_update_self" on challenge_participants for update to authenticated
  using (profile_id = auth.uid());
create policy "participants_delete_self" on challenge_participants for delete to authenticated
  using (profile_id = auth.uid());

-- activities: own rows, plus read access for circle-mates/challenge co-participants (leaderboards).
create policy "activities_select_own_or_shared" on activities for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from circle_members cm1
      join circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.profile_id = auth.uid() and cm2.profile_id = activities.profile_id
    )
    or exists (
      select 1 from challenge_participants cp1
      join challenge_participants cp2 on cp1.challenge_id = cp2.challenge_id
      where cp1.profile_id = auth.uid() and cp2.profile_id = activities.profile_id
    )
  );
create policy "activities_insert_self" on activities for insert to authenticated with check (profile_id = auth.uid());
create policy "activities_update_self" on activities for update to authenticated using (profile_id = auth.uid());

-- quests: public catalogue, read-only from the client.
create policy "quests_select_all" on quests for select to authenticated using (true);

create policy "quest_completions_select_self" on quest_completions for select to authenticated using (profile_id = auth.uid());
create policy "quest_completions_insert_self" on quest_completions for insert to authenticated with check (profile_id = auth.uid());

-- campus map data: public read, coordinator-only writes.
create policy "locations_select_all" on campus_locations for select to authenticated using (true);
create policy "locations_write_coordinator" on campus_locations for insert to authenticated with check (is_coordinator());
create policy "locations_update_coordinator" on campus_locations for update to authenticated using (is_coordinator());

create policy "routes_select_all" on routes for select to authenticated using (true);
create policy "routes_write_coordinator" on routes for insert to authenticated with check (is_coordinator());

create policy "checkins_select_all" on route_checkins for select to authenticated using (true);
create policy "checkins_insert_self" on route_checkins for insert to authenticated with check (profile_id = auth.uid());

-- notifications: own only.
create policy "notifications_select_self" on notifications for select to authenticated using (profile_id = auth.uid());
create policy "notifications_update_self" on notifications for update to authenticated using (profile_id = auth.uid());
create policy "notifications_insert_self" on notifications for insert to authenticated with check (profile_id = auth.uid());

-- badges: public catalogue; user_badges readable app-wide (shown on leaderboards/profiles), never written by clients.
create policy "badges_select_all" on badges for select to authenticated using (true);
create policy "user_badges_select_all" on user_badges for select to authenticated using (true);

-- ============================================================================
-- AGGREGATE RPCs FOR THE COORDINATOR DASHBOARD (anonymous, no per-student rows)
-- ============================================================================

create or replace function coordinator_overview()
returns table (
  active_students_week int,
  total_campus_steps bigint,
  most_active_department text,
  most_popular_route text,
  most_active_hour int
) language sql stable security definer set search_path = public as $$
  select
    (select count(distinct profile_id)::int from activities where occurred_on >= current_date - interval '7 days'),
    (select coalesce(sum(steps), 0)::bigint from activities where occurred_on >= current_date - interval '7 days'),
    (select p.department from activities a join profiles p on p.id = a.profile_id
      where a.occurred_on >= current_date - interval '7 days' and p.department <> ''
      group by p.department order by sum(a.steps) desc limit 1),
    (select r.name from routes r
      join route_checkins rc on rc.location_id = r.location_id
      group by r.name order by count(*) desc limit 1),
    (select extract(hour from created_at)::int from activities
      where occurred_on >= current_date - interval '7 days'
      group by 1 order by count(*) desc limit 1)
  where is_coordinator();
$$;

create or replace function coordinator_department_leaderboard()
returns table (department text, total_steps bigint, active_students int)
language sql stable security definer set search_path = public as $$
  select p.department, coalesce(sum(a.steps), 0)::bigint as total_steps, count(distinct p.id)::int as active_students
  from profiles p
  left join activities a on a.profile_id = p.id and a.occurred_on >= current_date - interval '7 days'
  where is_coordinator() and p.department <> ''
  group by p.department
  order by total_steps desc;
$$;

create or replace function coordinator_route_usage()
returns table (route_name text, checkins int)
language sql stable security definer set search_path = public as $$
  select r.name as route_name, count(rc.id)::int as checkins
  from routes r
  left join route_checkins rc on rc.location_id = r.location_id
  where is_coordinator()
  group by r.name
  order by checkins desc;
$$;

-- ============================================================================
-- New-user bootstrap: create a profiles row the moment someone signs up.
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
