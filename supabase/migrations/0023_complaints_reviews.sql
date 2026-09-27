-- Complaint & Review system: report issues against facilities/coaches/
-- events, star ratings + reviews for facilities/coaches, and coordinator
-- moderation — reusing the existing coordinator role/dashboard rather than
-- a new admin system.
--
-- There is no coach or event directory table in this app (only
-- campus_locations for facilities), so coach/event targets are free-text
-- (target_label) rather than a fabricated directory.

-- profiles is own-row-only since 0005_profile_privacy.sql, so a
-- coordinator's RLS check can't join straight into another student's
-- profiles row (that join would just see zero rows). This mirrors
-- is_coordinator()/is_circle_member() from 0001: a narrow, read-only,
-- security definer lookup used only inside policy checks.
create or replace function profile_college(p_profile_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select college from profiles where id = p_profile_id;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

create table complaints (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('facility', 'coach', 'event')),
  target_location_id uuid references campus_locations(id) on delete set null,
  target_label text not null,
  category text not null check (category in ('safety', 'harassment', 'cleanliness', 'equipment', 'staff_behavior', 'other')),
  description text not null,
  status text not null check (status in ('open', 'in_review', 'resolved', 'rejected')) default 'open',
  admin_notes text,
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index on complaints (profile_id);
create index on complaints (status);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('facility', 'coach')),
  target_location_id uuid references campus_locations(id) on delete cascade,
  target_label text not null,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  moderation_status text not null check (moderation_status in ('visible', 'hidden')) default 'visible',
  moderation_reason text,
  moderated_by uuid references profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reviews_facility_needs_location check ((target_type = 'facility') = (target_location_id is not null))
);

-- One review per student per facility, and per student per (normalized) coach name.
create unique index reviews_one_per_user_per_facility_idx on reviews (profile_id, target_location_id) where target_type = 'facility';
create unique index reviews_one_per_user_per_coach_idx on reviews (profile_id, lower(trim(target_label))) where target_type = 'coach';
create index on reviews (target_location_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table complaints enable row level security;
alter table reviews enable row level security;

-- complaints: reporter sees their own; a coordinator sees every complaint
-- from a student at their own college. No delete policy anywhere — a
-- complaint is a record once filed, resolved or rejected but never erased.
-- Reporters have no update policy either, so status/admin_notes can only
-- ever be set by a coordinator — no column-privilege split needed here.
create policy "complaints_select_own_or_coordinator" on complaints for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (is_coordinator() and profile_college(profile_id) = profile_college((select auth.uid())))
  );
create policy "complaints_insert_self" on complaints for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "complaints_update_coordinator" on complaints for update to authenticated
  using (is_coordinator() and profile_college(profile_id) = profile_college((select auth.uid())))
  with check (is_coordinator() and profile_college(profile_id) = profile_college((select auth.uid())));

-- reviews: visible to everyone signed in; a hidden review stays visible to
-- its own author (so they know it was moderated) and to a coordinator at
-- their college (for moderation).
create policy "reviews_select_visible_or_own_or_coordinator" on reviews for select to authenticated
  using (
    moderation_status = 'visible'
    or profile_id = (select auth.uid())
    or (is_coordinator() and profile_college(profile_id) = profile_college((select auth.uid())))
  );
create policy "reviews_insert_self" on reviews for insert to authenticated
  with check (profile_id = (select auth.uid()));
-- Authors may edit their own review's row (RLS), but moderation_status and
-- its related columns are only ever settable through moderate_review() below
-- — enforced at the column-privilege level, not by RLS, since RLS can't
-- restrict which columns an allowed UPDATE touches.
create policy "reviews_update_self" on reviews for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "reviews_delete_self" on reviews for delete to authenticated
  using (profile_id = (select auth.uid()));

revoke update on reviews from authenticated;
grant update (rating, body) on reviews to authenticated;

-- ============================================================================
-- RPC — the only way moderation_status/reason/moderated_by/at ever change.
-- ============================================================================

create or replace function moderate_review(p_review_id uuid, p_hide boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  target reviews%rowtype;
begin
  select * into target from reviews where id = p_review_id;
  if target.id is null then
    raise exception 'Review not found.';
  end if;
  if not is_coordinator() or profile_college(target.profile_id) <> profile_college(auth.uid()) then
    raise exception 'Only a coordinator at the same college can moderate this review.';
  end if;

  update reviews
  set moderation_status = case when p_hide then 'hidden' else 'visible' end,
      moderation_reason = p_reason,
      moderated_by = auth.uid(),
      moderated_at = now()
  where id = p_review_id;
end;
$$;

grant execute on function moderate_review(uuid, boolean, text) to authenticated;

-- ============================================================================
-- Aggregate rating for facility cards — visible reviews only, no reviewer
-- identity exposed. Same "curated cross-user view" precedent as
-- public_profiles (0005).
-- ============================================================================

create or replace view facility_ratings
with (security_invoker = off) as
  select target_location_id as location_id, avg(rating)::numeric(3, 2) as avg_rating, count(*)::int as review_count
  from reviews
  where target_type = 'facility' and moderation_status = 'visible'
  group by target_location_id;

revoke all on facility_ratings from anon;
grant select on facility_ratings to authenticated;
