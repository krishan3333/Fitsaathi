-- Anti-cheat: label activities by trust level, cap unrealistic manual entries,
-- validate GPS pace/distance, and weight challenge progress by how verified the
-- source is. Labels are handled client-side (activity-history.tsx); this
-- migration is the server-side enforcement, since none existed before.

-- 1. Close the RLS gap that let a client insert source='quest' directly,
-- bypassing the real quest-completion flow (trg_log_quest_activity) entirely
-- to fake a "verified" entry. log_quest_as_activity() is security definer and
-- runs as the table owner, which bypasses RLS, so it's unaffected.
drop policy "activities_insert_self" on activities;
create policy "activities_insert_self" on activities for insert to authenticated
  with check (profile_id = auth.uid() and source in ('manual', 'gps_route'));

-- 2. Cap unrealistic manual entries per single log.
alter table activities add constraint activities_manual_caps check (
  source <> 'manual' or (steps <= 50000 and distance_km <= 100 and active_minutes <= 600)
);

-- 3. Validate GPS pace/distance plausibility — blocks a spoofed position
-- stream claiming, say, 10km in 2 minutes.
alter table activities add constraint activities_gps_plausible check (
  source <> 'gps_route' or (
    active_minutes >= 1 and distance_km <= 100 and
    (distance_km / (active_minutes / 60.0)) <= case activity_type
      when 'walk' then 8
      when 'run' then 22
      when 'cycle' then 45
      else 45
    end
  )
);

-- 4. Weight challenge progress by source: verified activity (GPS/quest) counts
-- more than self-reported manual entries.
create or replace function sync_challenge_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  weight numeric := case new.source when 'gps_route' then 1.15 when 'quest' then 1.25 else 1.0 end;
begin
  update challenge_participants cp
  set progress_value = greatest(cp.progress_value, (select p.current_streak from profiles p where p.id = new.profile_id))
  from challenges c
  where c.id = cp.challenge_id
    and cp.profile_id = new.profile_id
    and c.type = 'active_streak'
    and c.start_date <= new.occurred_on and c.end_date >= new.occurred_on;

  update challenge_participants cp
  set progress_value = cp.progress_value + weight * case c.type
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
