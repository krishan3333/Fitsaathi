-- Two bugs in sync_challenge_progress(): (1) active_streak challenges always
-- added 0, so they never showed progress; (2) everything else was fine, but
-- kept in the same function so the active_streak fix has to live alongside it.
--
-- Fix: active_streak isn't summable across activities the way steps/distance/
-- minutes are — it's a live snapshot of profiles.current_streak. trg_bump_streak
-- (alphabetically before trg_sync_challenge_progress, so it always fires first
-- on the same insert) already updates that value before this trigger runs, so
-- we just set progress_value to it directly instead of accumulating.

create or replace function sync_challenge_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update challenge_participants cp
  set progress_value = greatest(cp.progress_value, (select p.current_streak from profiles p where p.id = new.profile_id))
  from challenges c
  where c.id = cp.challenge_id
    and cp.profile_id = new.profile_id
    and c.type = 'active_streak'
    and c.start_date <= new.occurred_on and c.end_date >= new.occurred_on;

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
    else 0
  end
  from challenges c
  where c.id = cp.challenge_id
    and cp.profile_id = new.profile_id
    and c.type <> 'active_streak'
    and c.start_date <= new.occurred_on and c.end_date >= new.occurred_on;
  return new;
end;
$$;
