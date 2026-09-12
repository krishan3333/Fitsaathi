-- Keep streaks, levels, challenge progress, and badges in sync whenever a
-- student logs an activity or completes a quest. All triggers run as the
-- table owner so they can update rows the client itself isn't allowed to.

create or replace function bump_streak_and_level()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_day date;
  new_streak int;
begin
  select max(occurred_on) into last_day
  from activities
  where profile_id = new.profile_id and occurred_on < new.occurred_on;

  select current_streak into new_streak from profiles where id = new.profile_id;

  if last_day is null or last_day < new.occurred_on - 1 then
    new_streak := 1;
  elsif last_day = new.occurred_on - 1 then
    new_streak := coalesce(new_streak, 0) + 1;
  end if; -- same-day repeat activity: streak unchanged

  update profiles set
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    level = case
      when new_streak >= 21 then 'Campus Champion'
      when new_streak >= 7 then 'Consistent'
      when new_streak >= 3 then 'Active'
      else level
    end
  where id = new.profile_id;

  return new;
end;
$$;

create trigger trg_bump_streak
  after insert on activities
  for each row execute function bump_streak_and_level();

-- Roll a logged activity into every challenge the student is currently in.
create or replace function sync_challenge_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update challenge_participants cp
  set progress_value = cp.progress_value + case c.type
    when 'daily_steps' then new.steps
    when 'weekly_steps' then new.steps
    when 'team_steps' then new.steps
    when 'walking_distance' then case when new.activity_type = 'walk' then new.distance_km else 0 end
    when 'running_distance' then case when new.activity_type = 'run' then new.distance_km else 0 end
    when 'cycling_distance' then case when new.activity_type = 'cycle' then new.distance_km else 0 end
    when 'workout_minutes' then new.active_minutes
    when 'department_vs_department' then new.steps
    when 'hostel_vs_hostel' then new.steps
    when 'active_streak' then 0 -- derived from profiles.current_streak, not accumulated here
    else 0
  end
  from challenges c
  where c.id = cp.challenge_id
    and cp.profile_id = new.profile_id
    and c.start_date <= new.occurred_on and c.end_date >= new.occurred_on;
  return new;
end;
$$;

create trigger trg_sync_challenge_progress
  after insert on activities
  for each row execute function sync_challenge_progress();

-- Award badges as milestones are hit. Idempotent via the unique(profile_id, badge_id) constraint.
create or replace function award_badge(target_profile uuid, badge_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into user_badges (profile_id, badge_id)
  select target_profile, id from badges where name = badge_name
  on conflict do nothing;
end;
$$;

create or replace function check_badges_after_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  streak int;
  weekend_days int;
begin
  select current_streak into streak from profiles where id = new.profile_id;

  if new.steps >= 10000 then
    perform award_badge(new.profile_id, 'Step Champion');
  end if;

  if streak >= 7 then
    perform award_badge(new.profile_id, 'Consistency Star');
  end if;

  if streak = 1 and exists (
    select 1 from activities
    where profile_id = new.profile_id and occurred_on < new.occurred_on - 2
  ) then
    perform award_badge(new.profile_id, 'Comeback Hero');
  end if;

  select count(distinct occurred_on) into weekend_days
  from activities
  where profile_id = new.profile_id
    and occurred_on >= date_trunc('week', new.occurred_on)::date + 5
    and extract(dow from occurred_on) in (0, 6);
  if weekend_days >= 2 then
    perform award_badge(new.profile_id, 'Weekend Warrior');
  end if;

  if exists (
    select 1 from challenge_participants cp
    join challenges c on c.id = cp.challenge_id
    where cp.profile_id = new.profile_id and c.circle_id is not null and cp.progress_value > 0
  ) then
    perform award_badge(new.profile_id, 'Team Player');
  end if;

  return new;
end;
$$;

create trigger trg_check_badges
  after insert on activities
  for each row execute function check_badges_after_activity();

-- Completing a quest logs it as an activity so it counts toward totals too.
create or replace function log_quest_as_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q quests%rowtype;
begin
  select * into q from quests where id = new.quest_id;
  insert into activities (profile_id, activity_type, steps, active_minutes, source)
  values (new.profile_id, 'quest', q.estimated_steps, q.duration_minutes, 'quest');
  return new;
end;
$$;

create trigger trg_log_quest_activity
  after insert on quest_completions
  for each row execute function log_quest_as_activity();
