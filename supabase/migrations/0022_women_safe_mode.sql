-- Women-Safe Mode: trusted contacts, safety sessions with optional live
-- location sharing, and an SOS button.
--
-- No SMS/email/telephony provider exists in this app (no API keys, no
-- integration) and none should be faked — so SOS does two real things:
-- the client opens a real device-native share/SMS/WhatsApp handoff to each
-- trusted contact (the student's own phone actually sends it), and this
-- migration's trigger_sos() RPC notifies real campus coordinators (an
-- existing staff role, not an invented emergency service) in-app, via the
-- existing notifications table, with the last known location.
--
-- Every table here is owner-only — no policy grants any other user or role
-- read/write access. Coordinators only ever learn a location because
-- trigger_sos() explicitly inserts a notification row for them; there is no
-- standing read access to safety_sessions or trusted_contacts for anyone
-- but the owner.

alter table profiles add column women_safe_mode boolean not null default false;

-- ============================================================================
-- TABLES
-- ============================================================================

create table trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  created_at timestamptz not null default now()
);

create index on trusted_contacts (profile_id);

create table safety_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('active', 'ended', 'sos')) default 'active',
  share_location boolean not null default false,
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  sos_at timestamptz
);

-- Only one open (active or sos) session per student at a time.
create unique index safety_sessions_one_open_idx on safety_sessions (profile_id) where status in ('active', 'sos');
create index on safety_sessions (profile_id);

-- ============================================================================
-- ROW LEVEL SECURITY — owner-only, full stop.
-- ============================================================================

alter table trusted_contacts enable row level security;
alter table safety_sessions enable row level security;

create policy "trusted_contacts_select_self" on trusted_contacts for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "trusted_contacts_insert_self" on trusted_contacts for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "trusted_contacts_update_self" on trusted_contacts for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "trusted_contacts_delete_self" on trusted_contacts for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Plain owner CRUD covers start (insert), live checkpoint updates and
-- stopping a session (update to status='ended') — no RPC needed, since none
-- of that touches another user's row. Only the SOS fan-out below does.
create policy "safety_sessions_select_self" on safety_sessions for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "safety_sessions_insert_self" on safety_sessions for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "safety_sessions_update_self" on safety_sessions for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- ============================================================================
-- RPC
-- ============================================================================

-- The one cross-user write in this feature: fans an SOS out to campus
-- coordinators. Security definer only to reach other users' notification
-- rows (same reason as coordinator_broadcast_announcement, 0004) — it does
-- not, and must not, grant any standing read access to safety_sessions.
create or replace function trigger_sos(p_session_id uuid, p_lat double precision default null, p_lng double precision default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller_name text;
  caller_college text;
  maps_url text;
begin
  update safety_sessions
  set status = 'sos',
      sos_at = now(),
      last_lat = coalesce(p_lat, last_lat),
      last_lng = coalesce(p_lng, last_lng),
      last_location_at = case when p_lat is not null then now() else last_location_at end
  where id = p_session_id and profile_id = auth.uid() and status in ('active', 'sos');

  if not found then
    raise exception 'No active safety session found to trigger SOS on.';
  end if;

  select name, college into caller_name, caller_college from profiles where id = auth.uid();

  maps_url := case when p_lat is not null and p_lng is not null
    then 'https://www.google.com/maps?q=' || p_lat || ',' || p_lng
    else null end;

  insert into notifications (profile_id, title, body, type, link)
  select p.id,
    'SOS alert',
    coalesce(caller_name, 'A student') || ' triggered an SOS.' ||
      case when maps_url is not null then ' Last known location: ' || maps_url else ' No location was shared.' end,
    'sos',
    maps_url
  from profiles p
  where p.role = 'coordinator' and p.college = caller_college;
end;
$$;

grant execute on function trigger_sos(uuid, double precision, double precision) to authenticated;
