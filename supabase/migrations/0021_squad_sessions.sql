-- Headline 2: Squad Sessions with peer-verified activity.
--
-- A live group walk/run/cycle (or quest) where everyone's progress streams to
-- a shared board, and on finish the server checks whether participants were
-- actually together (not just self-reported) before stamping the activity
-- peer-verified. A cheap, in-person answer to "what stops students faking
-- steps": collusion is still possible, but it takes coordinating with a
-- friend in person, not editing one number.

-- ============================================================================
-- TABLES
-- ============================================================================

create table squad_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('walk', 'run', 'cycle', 'quest')),
  quest_id uuid references quests(id) on delete set null,
  join_code text not null,
  status text not null check (status in ('pending', 'live', 'ended', 'cancelled')) default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only codes for sessions still open need to be unique — once a session ends
-- its code is free to be reissued, instead of accumulating a global unique
-- constraint that would eventually force ever-longer codes.
create unique index squad_sessions_active_code_idx on squad_sessions (join_code) where status in ('pending', 'live');
create index on squad_sessions (host_id);

create table squad_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references squad_sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  distance_km numeric not null default 0,
  steps int not null default 0,
  active_minutes int not null default 0,
  last_checkpoint_at timestamptz,
  verified boolean not null default false,
  verified_reason text,
  activity_id uuid references activities(id) on delete set null,
  unique (session_id, profile_id)
);

create index on squad_participants (session_id);
create index on squad_participants (profile_id);

-- activities: a fourth source, alongside the trust label it carries.
alter table activities drop constraint activities_source_check;
alter table activities add constraint activities_source_check
  check (source in ('manual', 'quest', 'gps_route', 'squad'));

alter table activities add column peer_verified boolean not null default false;
alter table activities add column squad_session_id uuid references squad_sessions(id) on delete set null;

-- Same pace/distance plausibility ceilings as gps_route (0013) now also gate
-- squad activities — finalize_squad_session (below) pre-checks this exact
-- formula and simply skips inserting an activity at all when it fails, so
-- this constraint should never actually fire in normal operation; it's
-- defense-in-depth against a bug in that check, not the primary gate.
alter table activities drop constraint activities_gps_plausible;
alter table activities add constraint activities_gps_plausible check (
  source not in ('gps_route', 'squad') or (
    active_minutes >= 1 and distance_km <= 100 and
    (distance_km / (active_minutes / 60.0)) <= case activity_type
      when 'walk' then 8
      when 'run' then 22
      when 'cycle' then 45
      else 45
    end
  )
);

-- quest_completions: tags a completion earned via a squad quest, so the
-- normal log_quest_as_activity() trigger (0002) knows to skip — the squad
-- finalize flow inserts the (peer-verified) activity row itself, and without
-- this the two would double-log the same quest.
alter table quest_completions add column squad_session_id uuid references squad_sessions(id) on delete set null;

insert into badges (name, description, icon) values
  ('Squad Goals', 'Completed a peer-verified squad session', 'users')
on conflict (name) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY — no client insert/delete policies on either table at
-- all: every row is created by a SECURITY DEFINER RPC below (pattern:
-- join_circle_by_code, 0011). activities' own insert policy already only
-- allows source in ('manual','gps_route') (0013), so a client could never
-- insert source='squad' directly either.
-- ============================================================================

alter table squad_sessions enable row level security;
alter table squad_participants enable row level security;

create or replace function is_squad_member(p_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from squad_participants where session_id = p_session and profile_id = auth.uid());
$$;

create policy "squad_sessions_select_member" on squad_sessions for select to authenticated
  using (host_id = auth.uid() or is_squad_member(id));
create policy "squad_sessions_update_host" on squad_sessions for update to authenticated
  using (host_id = auth.uid()) with check (status <> 'ended');

create policy "squad_participants_select_member" on squad_participants for select to authenticated
  using (is_squad_member(session_id));
-- Live checkpoint updates (distance/steps/GPS fixes) from the participant's
-- own device — only while the session hasn't already been finalized.
create policy "squad_participants_update_self" on squad_participants for update to authenticated
  using (
    profile_id = auth.uid()
    and exists (select 1 from squad_sessions s where s.id = session_id and s.status in ('pending', 'live'))
  )
  with check (profile_id = auth.uid());

-- ============================================================================
-- RPCs
-- ============================================================================

create or replace function create_squad_session(p_activity_type text, p_quest_id uuid default null)
returns table (id uuid, join_code text)
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into squad_sessions (host_id, activity_type, quest_id, join_code)
      values (auth.uid(), p_activity_type, p_quest_id, code)
      returning squad_sessions.id into new_id;
      exit;
    exception when unique_violation then
      -- join_code collided with another currently-open session; try again.
    end;
  end loop;

  insert into squad_participants (session_id, profile_id) values (new_id, auth.uid());

  id := new_id;
  join_code := code;
  return next;
end;
$$;

grant execute on function create_squad_session(text, uuid) to authenticated;

create or replace function join_squad_by_code(p_code text)
returns table (id uuid, activity_type text, quest_id uuid, status text, host_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  target squad_sessions%rowtype;
begin
  -- squad_sessions.status must be qualified here — it would otherwise be
  -- ambiguous against this function's own `status` OUT parameter.
  select * into target from squad_sessions where join_code = upper(trim(p_code)) and squad_sessions.status in ('pending', 'live');
  if target.id is null then
    raise exception 'No active squad session found with that code.';
  end if;

  if target.host_id <> auth.uid() and not exists (
    select 1 from circle_members cm1
    join circle_members cm2 on cm1.circle_id = cm2.circle_id
    where cm1.profile_id = target.host_id and cm2.profile_id = auth.uid()
  ) then
    raise exception 'You need to share a Fit Circle with the host to join.';
  end if;

  insert into squad_participants (session_id, profile_id) values (target.id, auth.uid())
  on conflict (session_id, profile_id) do nothing;

  return query select target.id, target.activity_type, target.quest_id, target.status, target.host_id;
end;
$$;

grant execute on function join_squad_by_code(text) to authenticated;

-- Same circle-mates reachability as notify_circle_mates (0018) — any current
-- squad member can pull in more circle-mates while the lobby/session is open.
create or replace function invite_to_squad(p_session_id uuid, p_profile_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  session squad_sessions%rowtype;
  inserted int;
begin
  select * into session from squad_sessions where id = p_session_id;
  if session.id is null or session.status not in ('pending', 'live') then
    raise exception 'Squad session is not open for invites.';
  end if;
  if not exists (select 1 from squad_participants where session_id = p_session_id and profile_id = auth.uid()) then
    raise exception 'Only current squad members can invite.';
  end if;

  with mates as (
    select distinct cm.profile_id
    from circle_members cm
    join circle_members mine on mine.circle_id = cm.circle_id
    where mine.profile_id = auth.uid() and cm.profile_id <> auth.uid()
  )
  insert into notifications (profile_id, title, body, type, link)
  select mates.profile_id, 'Squad session invite', 'Join a live squad session — code ' || session.join_code, 'squad',
    '/squad/join?code=' || session.join_code
  from mates
  where mates.profile_id = any(p_profile_ids);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function invite_to_squad(uuid, uuid[]) to authenticated;

create or replace function start_squad_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update squad_sessions set status = 'live', started_at = now()
  where id = p_session_id and host_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Only the host can start a pending session.';
  end if;
end;
$$;

grant execute on function start_squad_session(uuid) to authenticated;

-- Lets the host abandon a lobby or a live session without a finalize —
-- otherwise a session nobody ever finishes sits in 'live' forever with no
-- path to the 'cancelled' status the schema already has room for.
create or replace function cancel_squad_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update squad_sessions set status = 'cancelled', ended_at = now()
  where id = p_session_id and host_id = auth.uid() and status in ('pending', 'live');

  if not found then
    raise exception 'Only the host can cancel a pending or live session.';
  end if;
end;
$$;

grant execute on function cancel_squad_session(uuid) to authenticated;

create or replace function squad_distance_meters(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2
    + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- The core anti-cheat check. Host-only, once (status must be 'live'; a
-- concurrent second call sees 'ended' after the first commits and is
-- rejected). Priority among failure reasons, individual checks before social
-- ones: no_gps_fix (missing a fix at all) > too_short (< 5 min) >
-- implausible_pace (checked, and the activity insert skipped, *before* the
-- colocation checks below — the activities_gps_plausible constraint would
-- reject the insert outright, so this must never be reached with a bad pace)
-- > solo (nobody else in the session has fixes either) > not_colocated (fixes
-- exist, but no one else's start+end were both within 150m with >=5min of
-- overlapping session time). Passing all of them = peer-verified.
create or replace function finalize_squad_session(p_session_id uuid)
returns table (profile_id uuid, verified boolean, verified_reason text, distance_km numeric, steps int, active_minutes int)
language plpgsql security definer set search_path = public as $$
declare
  session squad_sessions%rowtype;
  pace_ceiling numeric;
  fixed_count int;
  r record;
  window_start timestamptz;
  window_end timestamptz;
  reason text;
  new_activity_id uuid;
  has_colocated_peer boolean;
  broadcast_results jsonb := '[]'::jsonb;
begin
  select * into session from squad_sessions where id = p_session_id for update;
  if session.id is null then
    raise exception 'Squad session not found.';
  end if;
  if session.host_id <> auth.uid() then
    raise exception 'Only the host can finalize a squad session.';
  end if;
  if session.status <> 'live' then
    raise exception 'Only a live session can be finalized.';
  end if;

  update squad_sessions set status = 'ended', ended_at = now() where id = p_session_id;
  session.status := 'ended';
  session.ended_at := now();

  pace_ceiling := case session.activity_type when 'walk' then 8 when 'run' then 22 when 'cycle' then 45 when 'quest' then 8 else 45 end;

  select count(*) into fixed_count
  from squad_participants
  where session_id = p_session_id
    and start_lat is not null and start_lng is not null and end_lat is not null and end_lng is not null;

  for r in select * from squad_participants where session_id = p_session_id loop
    reason := null;
    new_activity_id := null;
    window_start := r.joined_at;
    window_end := coalesce(r.left_at, session.ended_at);

    if r.start_lat is null or r.start_lng is null or r.end_lat is null or r.end_lng is null then
      reason := 'no_gps_fix';
    elsif r.active_minutes < 5 then
      reason := 'too_short';
    elsif (r.distance_km / (r.active_minutes / 60.0)) > pace_ceiling then
      reason := 'implausible_pace';
    elsif fixed_count < 2 then
      reason := 'solo';
    else
      select exists (
        select 1 from squad_participants p2
        where p2.session_id = p_session_id
          and p2.profile_id <> r.profile_id
          and p2.start_lat is not null and p2.start_lng is not null and p2.end_lat is not null and p2.end_lng is not null
          and squad_distance_meters(r.start_lat, r.start_lng, p2.start_lat, p2.start_lng) <= 150
          and squad_distance_meters(r.end_lat, r.end_lng, p2.end_lat, p2.end_lng) <= 150
          and extract(epoch from (
                least(window_end, coalesce(p2.left_at, session.ended_at)) - greatest(window_start, p2.joined_at)
              )) / 60.0 >= 5
      ) into has_colocated_peer;
      if not has_colocated_peer then
        reason := 'not_colocated';
      end if;
    end if;

    -- implausible_pace is the one failure with no activity row at all — the
    -- constraint above would reject the insert anyway, so we just never
    -- attempt it, rather than let a raised exception abort every other
    -- participant's result in the same transaction.
    if reason is null or reason <> 'implausible_pace' then
      insert into activities (profile_id, activity_type, steps, distance_km, active_minutes, source, peer_verified, squad_session_id, occurred_on)
      values (r.profile_id, session.activity_type, r.steps, r.distance_km, r.active_minutes, 'squad', reason is null, session.id, (session.started_at at time zone 'Asia/Kolkata')::date)
      returning activities.id into new_activity_id;

      if reason is null then
        perform award_badge(r.profile_id, 'Squad Goals');
        if session.quest_id is not null then
          insert into quest_completions (quest_id, profile_id, squad_session_id) values (session.quest_id, r.profile_id, session.id);
        end if;
      end if;
    end if;

    update squad_participants set verified = (reason is null), verified_reason = reason, activity_id = new_activity_id where id = r.id;

    profile_id := r.profile_id;
    verified := (reason is null);
    verified_reason := reason;
    distance_km := r.distance_km;
    steps := r.steps;
    active_minutes := r.active_minutes;

    -- Accumulated so every participant's client gets the whole roster's
    -- verdict from the one broadcast below, not just their own row — the
    -- host already has all of this as this function's normal return value,
    -- but everyone else only ever sees the DB-sent 'finalized' event.
    broadcast_results := broadcast_results || jsonb_build_object(
      'profileId', profile_id, 'verified', verified, 'verifiedReason', verified_reason,
      'distanceKm', distance_km, 'steps', steps, 'activeMinutes', active_minutes
    );
    return next;
  end loop;

  perform realtime.send(
    jsonb_build_object('type', 'finalized', 'sessionId', p_session_id, 'results', broadcast_results),
    'finalized',
    'squad:' || p_session_id,
    true
  );
end;
$$;

grant execute on function finalize_squad_session(uuid) to authenticated;

-- ============================================================================
-- Weighted challenge progress (0013/0012): squad sessions slot in above plain
-- GPS since a peer confirmed them, at the same weight as a quest when
-- verified; unverified squad activity is trusted no more than a plain GPS log.
-- ============================================================================

create or replace function sync_challenge_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  weight numeric := case
    when new.source = 'squad' and new.peer_verified then 1.3
    when new.source in ('squad', 'gps_route') then 1.15
    when new.source = 'quest' then 1.25
    else 1.0
  end;
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

-- log_quest_as_activity (0002): a squad quest's activity row is inserted by
-- finalize_squad_session itself (peer-verified, source='squad') — without
-- this early return, this trigger would insert a second, unverified
-- source='quest' activity for the same completion.
create or replace function log_quest_as_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q quests%rowtype;
begin
  if new.squad_session_id is not null then
    return new;
  end if;

  select * into q from quests where id = new.quest_id;
  insert into activities (profile_id, activity_type, steps, active_minutes, source)
  values (new.profile_id, 'quest', q.estimated_steps, q.duration_minutes, 'quest');
  return new;
end;
$$;

-- ============================================================================
-- Realtime authorization for the private "squad:<session_id>" channel —
-- broadcast (live progress/reactions/handshake) and presence (roster) both
-- gate on this. Enabling `config.private = true` client-side routes every
-- send/subscribe through these policies on realtime.messages.
-- ============================================================================

create or replace function squad_topic_session(p_topic text)
returns uuid language sql immutable as $$
  select case when p_topic like 'squad:%' then substring(p_topic from 7)::uuid else null end;
$$;

create policy "squad_channel_access" on realtime.messages for select to authenticated
  using (is_squad_member(squad_topic_session(realtime.topic())));
create policy "squad_channel_send" on realtime.messages for insert to authenticated
  with check (is_squad_member(squad_topic_session(realtime.topic())));
