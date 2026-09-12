-- FitSaathi content seed — the campus content library the app needs to function.
-- This contains NO fake user accounts: real students sign up through the app,
-- and their data builds up from their own activity.
--
-- Run once after the migrations. Safe to re-run (guarded against duplicates).

-- ============================================================================
-- Badge catalogue (awarded automatically by the triggers in 0002)
-- ============================================================================
insert into badges (name, description, icon) values
  ('Step Champion', 'Logged 10,000+ steps in a single day', 'footprints'),
  ('Consistency Star', 'Kept a 7-day active streak', 'star'),
  ('Team Player', 'Contributed to a Fit Circle challenge', 'users'),
  ('Weekend Warrior', 'Stayed active on both weekend days', 'sun'),
  ('Comeback Hero', 'Bounced back after missing active days', 'flame')
on conflict (name) do nothing;

-- ============================================================================
-- Quest catalogue — the pool the rule-based planner picks from.
-- `quest_type` is what lib/quest-engine.ts matches its rules against; keep at
-- least one of each per audience: streak_rescue, stretch, indoor_workout,
-- stair_challenge, group_walk, sport, short_walk, long_run.
--
-- `audience` keeps the planner from serving campus-specific quests ("before
-- your 2 PM class", named campus venues) to a "personal" (non-student)
-- account, and vice versa — see migration 0009_quest_audience.sql.
-- ============================================================================
insert into quests (title, description, duration_minutes, difficulty, location, estimated_steps, points, indoor_outdoor, quest_type, audience)
select * from (values
  -- Student / campus-specific.
  ('Walk 2,000 steps before your next class', 'A brisk loop around campus to squeeze in steps between lectures.', 15, 'Easy', 'Campus Green Loop', 2000, 20, 'Outdoor', 'short_walk', 'student'),
  ('10-minute hostel-room mobility workout', 'Bodyweight mobility drills you can do in your room.', 10, 'Easy', 'Hostel Workout Zone', 400, 15, 'Indoor', 'indoor_workout', 'student'),
  ('15-minute group walk with friends', 'Grab whoever is free and loop the Campus Green together.', 15, 'Easy', 'Campus Green Loop', 1800, 25, 'Outdoor', 'group_walk', 'student'),
  ('8-floor stair challenge', 'Climb Block B stairs for a quick heart-rate spike.', 10, 'Medium', 'Stair Challenge — Block B', 900, 20, 'Indoor', 'stair_challenge', 'student'),
  ('20-minute badminton session at Sports Block', 'Casual doubles or singles at the Badminton Court.', 20, 'Medium', 'Badminton Court', 1500, 30, 'Outdoor', 'sport', 'student'),
  ('5-minute Streak Rescue workout', 'A tiny, no-excuses session to keep your streak alive.', 5, 'Easy', 'Hostel Workout Zone', 200, 10, 'Indoor', 'streak_rescue', 'student'),
  ('5-minute desk stretch break', 'Loosen up between lectures.', 5, 'Easy', 'Indoor Hall', 100, 10, 'Indoor', 'stretch', 'student'),
  ('30-minute campus run', 'Longer outdoor session for building stamina.', 30, 'Hard', 'Sports Ground', 4200, 40, 'Outdoor', 'long_run', 'student'),
  -- Personal / general — no campus references, generic wording and locations.
  ('Walk 2,000 steps on your next break', 'A brisk walk wherever you are — a block, a park, or just around the house.', 15, 'Easy', 'Wherever you are', 2000, 20, 'Outdoor', 'short_walk', 'personal'),
  ('10-minute at-home mobility workout', 'Bodyweight mobility drills you can do in any room.', 10, 'Easy', 'At home', 400, 15, 'Indoor', 'indoor_workout', 'personal'),
  ('15-minute walk with a friend or family member', 'Grab whoever is free for a loop around the neighborhood.', 15, 'Easy', 'Your neighborhood', 1800, 25, 'Outdoor', 'group_walk', 'personal'),
  ('8-floor stair challenge', 'Climb a few flights in any building for a quick heart-rate spike.', 10, 'Medium', 'Any staircase nearby', 900, 20, 'Indoor', 'stair_challenge', 'personal'),
  ('20-minute badminton or racquet sport', 'Casual doubles or singles at a nearby court.', 20, 'Medium', 'A nearby court', 1500, 30, 'Outdoor', 'sport', 'personal'),
  ('5-minute Streak Rescue workout', 'A tiny, no-excuses session to keep your streak alive.', 5, 'Easy', 'At home', 200, 10, 'Indoor', 'streak_rescue', 'personal'),
  ('5-minute desk stretch break', 'Loosen up between tasks.', 5, 'Easy', 'Wherever you are', 100, 10, 'Indoor', 'stretch', 'personal'),
  ('30-minute run in your area', 'Longer outdoor session for building stamina.', 30, 'Hard', 'Your neighborhood', 4200, 40, 'Outdoor', 'long_run', 'personal')
) as v(title, description, duration_minutes, difficulty, location, estimated_steps, points, indoor_outdoor, quest_type, audience)
where not exists (select 1 from quests q where q.title = v.title and q.audience = v.audience);

-- ============================================================================
-- Campus locations for FitRoute — scoped per college (migration 0006), since
-- different students belong to different colleges and should only see their
-- own campus's pins. This is EXAMPLE content for one college; each real
-- coordinator adds their own campus's locations from the coordinator
-- dashboard (auto-tagged with their own college — see 0006's RLS policy).
-- ============================================================================
insert into campus_locations (college, name, activity_type, lat, lng, distance_km, estimated_steps, crowd_level, safety_rating, has_water, is_open)
select * from (values
  ('Delhi College of Engineering', 'Campus Green Loop', 'Walking Loop', 28.7460, 77.1180, 1.2, 1600, 'Low', 'Good', true, true),
  ('Delhi College of Engineering', 'Sports Ground', 'Running Track', 28.7468, 77.1190, 0.8, 1050, 'Medium', 'Good', true, true),
  ('Delhi College of Engineering', 'Basketball Court', 'Basketball', 28.7472, 77.1175, 0.5, 650, 'Medium', 'Good', false, true),
  ('Delhi College of Engineering', 'Badminton Court', 'Badminton', 28.7465, 77.1200, 0.6, 780, 'Low', 'Good', false, true),
  ('Delhi College of Engineering', 'Indoor Hall', 'Indoor Fitness', 28.7458, 77.1165, 0.4, 500, 'Low', 'Good', true, true),
  ('Delhi College of Engineering', 'Hostel Workout Zone', 'Bodyweight Workout', 28.7480, 77.1205, 0.3, 350, 'Low', 'Good', true, true),
  ('Delhi College of Engineering', 'Stair Challenge — Block B', 'Stair Climb', 28.7463, 77.1172, 0.1, 220, 'Low', 'Fair', false, true),
  ('Delhi College of Engineering', 'Water Point — Central Lawn', 'Water Point', 28.7466, 77.1183, 0.2, 0, 'Low', 'Good', true, true),
  ('Delhi College of Engineering', 'Rest Area — Amphitheatre', 'Rest Area', 28.7455, 77.1178, 0.3, 0, 'Low', 'Good', false, true)
) as v(college, name, activity_type, lat, lng, distance_km, estimated_steps, crowd_level, safety_rating, has_water, is_open)
where not exists (select 1 from campus_locations c where c.college = v.college and c.name = v.name);

-- The mapped walking route, linked to its location pin.
insert into routes (name, distance_km, path, location_id)
select 'Campus Green Loop', 1.2,
  '[[77.1180,28.7460],[77.1195,28.7465],[77.1190,28.7475],[77.1170,28.7472],[77.1165,28.7462],[77.1180,28.7460]]',
  (select id from campus_locations where name = 'Campus Green Loop')
where not exists (select 1 from routes where name = 'Campus Green Loop');

-- ============================================================================
-- Coordinator access
-- ============================================================================
-- Roles aren't self-serve: everyone signs up as a student. To grant someone the
-- campus coordinator dashboard (/coordinator), promote their account by email
-- after they've signed up:
--
--   update profiles set role = 'coordinator'
--   where id = (select id from auth.users where email = 'you@college.edu');
