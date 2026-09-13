-- Headline 1: Fit Window engine + in-app nudges.
--
-- Adds the DB objects the feature needs: per-slot friend availability (for
-- "Aditi & Imran are free too" in a nudge, without leaking anyone's
-- timetable) and a dedupe log so the same nudge is never shown twice.
--
-- Nudges are generated in-app only, the moment a student opens the dashboard
-- (lib/nudge-generator.ts, called from app/(app)/page.tsx) — there is no
-- background delivery, no push subscriptions, and no service-role sweep: a
-- student who never opens the app never gets a notification.

-- ============================================================================
-- Per-slot friend availability, privacy-safe.
--
-- friends_available_now() (0005/0018) only ever returns a count for "right
-- now". The Fit Window engine needs, for each of *the caller's own* free
-- slots today, which circle-mates' slots overlap it — so a nudge can say who.
-- Nobody else's timetable ever reaches a browser: this always runs as
-- auth.uid(), so a student can only ever ask about themselves.
-- ============================================================================

create or replace function friends_free_for_slots(p_day text)
returns table (slot_start text, slot_end text, friend_names text[])
language sql stable security definer set search_path = public as $$
  with my_slots as (
    select (slot->>'start') as start, (slot->>'end') as fin
    from profiles p, jsonb_array_elements(p.free_slots) slot
    where p.id = auth.uid() and slot->>'day' = p_day
  ),
  mates as (
    select distinct cm.profile_id
    from circle_members cm
    join circle_members mine on mine.circle_id = cm.circle_id
    where mine.profile_id = auth.uid() and cm.profile_id <> auth.uid()
  )
  select
    ms.start as slot_start,
    ms.fin as slot_end,
    coalesce(
      array_agg(distinct
        case when mp.use_nickname and coalesce(mp.nickname, '') <> '' then mp.nickname else split_part(mp.name, ' ', 1) end
      ) filter (where mp.id is not null),
      '{}'
    ) as friend_names
  from my_slots ms
  left join mates on true
  left join profiles mp on mp.id = mates.profile_id
    and exists (
      select 1 from jsonb_array_elements(mp.free_slots) mslot
      where mslot->>'day' = p_day
        and (mslot->>'start') < ms.fin
        and (mslot->>'end') > ms.start
    )
  group by ms.start, ms.fin;
$$;

grant execute on function friends_free_for_slots(text) to authenticated;

-- ============================================================================
-- Nudge dedupe log — own-row only. A dashboard load attempts to insert one
-- row per candidate nudge (lib/nudge-generator.ts); the unique constraint is
-- the claim, so a nudge already shown today is simply skipped rather than
-- re-inserted. Unique per (profile, key): the same dedupe key naturally
-- recurs across different students on the same day (e.g. every
-- streak_rescue key embeds today's date, not who it's for).
-- ============================================================================

create table nudge_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  unique (profile_id, dedupe_key)
);

alter table nudge_log enable row level security;
create policy "nudge_log_select_self" on nudge_log for select to authenticated using (profile_id = auth.uid());
create policy "nudge_log_insert_self" on nudge_log for insert to authenticated with check (profile_id = auth.uid());
