# FitSaathi — features that can actually win SIH 26196

## Context

FitSaathi already implements almost the entire original spec (`1.md`): Fit Circles, 10 challenge types, realtime leaderboards with an Improvement League, a rule-based quest planner (plus Gemini-generated personal quests), FitRoute map with live weather/AQI green window and crowd check-ins, manual/GPS/quest activity logging with anti-cheat weighting, streaks/levels/badges, privacy controls, PWA shell, and an aggregate-only coordinator dashboard.

That makes it a *complete* submission but not yet a *distinctive* one. Every SIH fitness team will show challenges, leaderboards, streaks and a map. Judges will ask two questions the current build answers weakly:

1. **"What stops students faking steps without a wearable?"** Today: honour system + caps + source weighting. Not convincing on stage.
2. **"How does this get a student who is *not* already motivated to move?"** Today the app is entirely pull. The spec's proactive nudges ("you have a 15-min free slot", "rain expected soon") exist only as sample copy. Nothing ever fires.

The winning story is the tagline made literal: **the app finds the exact moment in a student's day when fitness fits, tells them, and gets their friends there too.** Two headline features deliver that and share infrastructure. Everything else is supporting or a quick win.

Two pre-existing bugs were found during planning and must be fixed first because they break the *current* demo:
- **Invites and emoji reactions never arrive.** `notifications_insert_self` (`supabase/migrations/0001_init.sql:298`) only allows `profile_id = auth.uid()`. `components/quests/invite-friends-dialog.tsx:66` and `components/leaderboard/emoji-react-button.tsx:18` insert rows for *other* users, RLS rejects them, the UI ignores the error and shows "sent".
- **Free-slot matching is in the wrong timezone once deployed.** `lib/quest-context.ts:12-13` uses server-local time (UTC on Vercel) and `friends_available_now()` (`0005_profile_privacy.sql:60`) uses `now()` (UTC on Supabase). Students enter slots in IST, so everything is off by 5h30 in production.

## Recommendation (build in this order)

| # | Feature | Why it wins | Effort |
|---|---|---|---|
| 0 | **Fix the two bugs above** | The existing social loop is silently dead; judges tapping "invite" on a second phone will see nothing. | 1 h |
| 1 | **Fit Window + push nudges** | Timetable ∩ hourly AQI/weather forecast ∩ friends free → a push notification at the right minute. Nobody else demos a phone buzzing with "Free 5:30–6:00, AQI 78, Aditi & Imran are free. Group walk?" India-specific, no hardware, reuses the quest engine. | 1.5–2 days |
| 2 | **Squad Sessions with peer-verified activity** | Live group walk; everyone's km streams to a shared board; on finish the server checks co-location and stamps the activity **Peer-verified** (weighted above GPS). A novel, cheap answer to the cheating question that is also the social mechanic. Demo with two phones. | 2 days, 2 devs |

Tier 2 (after the headlines, ≤1 day each): **Fit Buddy pact** (match by overlapping `free_slots` + goal + college, shared streak; the git log promised "buddy" but nothing shipped), **Campus Fit Coins** (turn the unused `quests.points` into a wallet with coordinator-defined rewards and QR redemption), **Pickup-game board** ("need 2 for badminton, Sports Block, 6 PM" tied to `campus_locations`).

Quick wins (hours): hourly Green Window strip on FitRoute (falls out of #1), weekly Gemini coach recap in `preferred_language`, Department Cup tile on coordinator dashboard, document `GEMINI_API_KEY` in README, enforce the no-op `hide_location` flag.

Deliberately NOT building: AI chatbot coach (every team has one; spec says rule-based), camera form-check / medical / parent / government features (banned by spec), wearable integrations (students don't own them; Health Connect stays a documented future `activities.source`), calorie or diet tracking.

---

## Step 0 — bug fixes (migration `0018_notification_fixes.sql` + 2 component edits)

1. New SECURITY DEFINER RPC `notify_circle_mates(p_profile_ids uuid[], p_title text, p_body text, p_type text, p_link text default null)`: filters ids to the caller's circle-mates (same join as `friends_available_now`), inserts `notifications` rows, returns count. Pattern: `0004_coordinator_broadcast.sql`.
2. Add nullable `notifications.link text`; render a `<Link>` in `components/notifications/notification-list.tsx` when set (needed by both headlines for deep links).
3. Swap the raw inserts in `invite-friends-dialog.tsx` and `emoji-react-button.tsx` for `supabase.rpc("notify_circle_mates", …)` and surface errors.
4. New `lib/time.ts` with `APP_TZ = "Asia/Kolkata"`, `localClock(now)` → `{ day, date, hhmm, minutes, hour }`; use it in `lib/quest-context.ts`. Recreate `friends_available_now()` with `now() at time zone 'Asia/Kolkata'`.

---

## Headline 1 — Fit Window engine + push nudges

### Design
- **Pure engine** `lib/fit-window.ts` (same style as `lib/quest-engine.ts`, tested with `node --test`): `computeFitWindows({ slots, day, nowMinutes, hourly, friendsBySlot, indoorOutdoorPref, minMinutes=10 })` walks each of today's free slots hour by hour, labels segments green/yellow/red from the hourly forecast (missing → yellow), merges equal neighbours, drops segments < 10 min, marks red ones as indoor-alternative windows. `score = min(minutes,60) + friends×20 + {green 30, yellow 10, red 0}`. `bestFitWindow()`, `describeWindow()` → "You're free 5:30–6:00 PM, AQI 78, Aditi & Imran are free too."
- **Hourly forecast** in `lib/weather.ts`: extract the thresholds of `getGreenWindow` into `classifyConditions(tempC, isRainy, aqi)`; add `fetchHourlyForecast(lat, lng)` (Open-Meteo `hourly=temperature_2m,precipitation,precipitation_probability,weather_code` + air-quality `hourly=us_aqi`, `timezone=Asia/Kolkata`, `forecast_days=1`, `next: { revalidate: 900 }`, lat/lng rounded to 2 dp so a whole college shares the cache).
- **Friends per slot, privacy-safe**: RPC `friends_free_for_slots_for(p_profile, p_day)` (execute granted to `service_role` only) returns, for each of *that student's own* slots, an array of circle-mate display names (nickname if `use_nickname`, else first name) whose slots overlap. Authenticated wrapper `friends_free_for_slots(p_day)` calls it with `auth.uid()`. No one else's timetable ever leaves Postgres.
- **Nudge rules** `lib/nudge-rules.ts` (pure, tested): `buildNudges(ctx)` emits `fit_window` (best upcoming window starting within 15 min, not red), `rain_soon` (rainy hour within 2 h and an outdoor window ends before it), `streak_rescue` (`daysSinceActive ≥ 2`, after 09:00), `circle_close` (≤ 2,000 steps from team goal). Each has a stable `dedupeKey` and maps to the notification `type` values `quest/weather/streak/circle` that `notification-list.tsx` already renders.
- **Web Push**: `web-push` + VAPID. Table `push_subscriptions(profile_id, endpoint unique, p256dh, auth, user_agent, last_seen_at)` with own-row RLS. `POST/DELETE app/api/push/subscribe/route.ts`. `components/profile/push-toggle.tsx` replaces the Notifications switch in `settings-panel.tsx`: requests permission, subscribes via `navigator.serviceWorker.ready.pushManager.subscribe`, stores it, sets `notifications_enabled`; shows hints for denied / unsupported / iOS-not-installed. `public/sw.js`: bump `CACHE` to `fitsaathi-v3`, add `push`, `notificationclick` (focus or open the deep link), `pushsubscriptionchange`. `sw-register.tsx`: `updateViaCache: "none"`; `next.config.ts`: `no-cache` header on `/sw.js`.
- **Scheduler**: logic lives in Next (`lib/nudge-runner.ts` `runNudgeSweep(admin, { profileIds?, force? })`) because it needs weather, the engine and VAPID signing. Trigger = `vercel.json` cron `*/15 * * * *` → `app/api/cron/nudges/route.ts` guarded by `Authorization: Bearer $CRON_SECRET`. Vercel Hobby only allows daily crons, so ship optional `0020_pg_cron_trigger.sql` (pg_cron + pg_net `net.http_get` to the same route every 10 min). Idempotency via `nudge_log(profile_id, dedupe_key unique)` using insert-on-conflict-do-nothing as the claim before sending. Sweep: subscribed profiles with `notifications_enabled` → one forecast fetch per college → per profile: friends-per-slot RPC, last-7-days activities, circle summary (extract `lib/fit-circle.ts` from `app/(app)/page.tsx`) → windows → nudges → push to every device + mirror row into `notifications`; delete subscriptions that return 404/410.
- **Demo mode**: `POST app/api/push/test/route.ts` runs the sweep for the caller with `force: true` (synthesises a window if none today). Button "Send me a test nudge" under the push toggle. Cron route also accepts `?profile=<uuid>&force=1` with the secret for curl demos.
- **UI**: `components/dashboard/fit-windows-card.tsx` ("Today's Fit Windows" timeline: coloured segments, friend avatars, "Start quest" per window) on Home above `NextQuestCard` and compact on `/quest`; `/quest?window=17:30-18:00` highlights the window a nudge pointed at. `lib/quest-context.ts` returns `fitWindows`/`bestWindow`.

### Files
New: `lib/time.ts`, `lib/fit-window.ts` (+test), `lib/nudge-rules.ts` (+test), `lib/nudge-runner.ts`, `lib/push.ts`, `lib/supabase/admin.ts` (service-role client, `server-only`), `lib/fit-circle.ts`, `app/api/cron/nudges/route.ts`, `app/api/push/subscribe/route.ts`, `app/api/push/test/route.ts`, `components/dashboard/fit-windows-card.tsx`, `components/profile/push-toggle.tsx`, `supabase/migrations/0019_fit_windows.sql`, `0020_pg_cron_trigger.sql` (optional), `vercel.json`.
Modified: `lib/weather.ts`, `lib/quest-context.ts`, `lib/activity-stats.ts` (`daysSinceLastActive`), `lib/supabase/types.ts`, `app/(app)/page.tsx`, `app/(app)/quest/page.tsx`, `components/profile/settings-panel.tsx`, `components/layout/sw-register.tsx`, `public/sw.js`, `next.config.ts`, `proxy.ts` (add `/api/cron` to public paths), `.env.example`, `README.md`, `package.json` (`web-push`, `server-only`, `@types/web-push`).
Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

### Order
Day 1: time.ts → weather hourly → fit-window + nudge-rules with tests → migration 0019 + types → quest-context → FitWindowsCard on Home/Quest (already demoable in-app).
Day 2: web-push deps + VAPID → admin client + push.ts → sw.js + toggle + subscribe route → nudge-runner + cron route + test route + vercel.json → deploy preview, test on Android.

---

## Headline 2 — Squad Sessions with peer-verified activity

### Design
- **Schema** (`0021_squad_sessions.sql`): `squad_sessions(id, host_id, activity_type walk/run/cycle/quest, quest_id, join_code, status pending/live/ended/cancelled, started_at, ended_at)` with a partial unique index on active codes; `squad_participants(session_id, profile_id, joined_at, left_at, start_lat/lng, end_lat/lng, distance_km, steps, active_minutes, last_checkpoint_at, verified, verified_reason, activity_id)`. `activities` gains `source='squad'` in its check constraint plus `peer_verified boolean` and `squad_session_id`; `activities_gps_plausible` extended to `squad`; the 0013 insert policy already blocks clients from `squad`. `quest_completions.squad_session_id` + early return in `log_quest_as_activity()` so quest squads don't double-log. `sync_challenge_progress()` weight: `squad && peer_verified → 1.3`, else `squad/gps_route → 1.15`, `quest → 1.25`, manual 1.0. New badge **Squad Goals**.
- **No client inserts** on squad tables; everything via SECURITY DEFINER RPCs (pattern `0011_join_circle_by_code.sql`): `create_squad_session(type, quest_id?)` → `{id, join_code}`; `join_squad_by_code(code)` (must share a circle with the host); `invite_to_squad(session_id, ids[])` (notifications with `link='/squad/join?code=…'`); `start_squad_session(id)`; `finalize_squad_session(id)`. RLS: participants select; participants update only their own row while status is pending/live; host updates session except to `ended`.
- **`finalize_squad_session`** (host only, once): lock row, set ended; per participant: pace check (same ceilings as 0013, quest uses walk); `colocated` = duration ≥ 5 min ∧ ≥ 2 participants with fixes ∧ another participant's start and end both within 150 m ∧ ≥ 5 min time overlap; `verified_reason ∈ no_gps_fix/too_short/solo/not_colocated/implausible_pace`; insert one `activities` row (`source='squad'`, `peer_verified=colocated`), award badge if verified, insert `quest_completions` if quest; finally `realtime.send(results, 'finalized', 'squad:<id>', true)` so every client gets the results without a refetch.
- **Realtime**: private channel `squad:<session_id>` (`config.private = true`, RLS policies on `realtime.messages` using `is_squad_member(squad_topic_session(realtime.topic()))`). Presence for roster only (track once; 5-per-30 s cap). Broadcast events: `progress` every 5 s `{profileId, distanceKm, steps, elapsedSec}` (no coordinates, respects `hide_location`), `started`, `end_requested`, `final_saved`, `reaction`, and DB-sent `finalized`. Each client checkpoints its own `squad_participants` row on first fix, every 60 s, and on end. End handshake: host broadcasts `end_requested` → everyone saves and replies `final_saved` → host calls finalize after all replies or 8 s.
- **Hooks**: `lib/use-gps-tracker.ts` (extracted from `gps-session-dialog.tsx`; ignore fixes with accuracy > 50 m and moves < 3 m), `lib/use-squad-channel.ts` (`{ status, members, phase lobby/live/ending/summary, startedAt, results, reactions, send* }`), `lib/squad.ts` (types, `trustLabel(activity)`).
- **UI**: `app/(app)/squad/[id]/page.tsx` (server loads session/participants/public_profiles; `SquadLiveBoard` client, full-screen `fixed inset-0`), `app/(app)/squad/join/page.tsx` (auto-joins from `?code=`), `app/(app)/squad/page.tsx` hub. Components in `components/squad/`: `start-squad-dialog`, `squad-invite-dialog` (copy of invite-friends-dialog using `invite_to_squad`, shows code + `navigator.share`), `squad-live-board`, `squad-roster`, `squad-summary` ("Peer-verified ✅" or reason), `squad-reactions` (reuse `EMOJIS`). Entry points: "Start with squad" on `quest-card.tsx`, "Do this with your squad" in `gps-session-dialog.tsx`, 4th Quick Action tile. `activity-history.tsx` gets `Squad (GPS)` / `Peer-verified` labels; `notification-list.tsx` gets a squad icon.
- **Stage demo**: `next dev --experimental-https -H 0.0.0.0`; phone = host walking, laptop = friend with DevTools Sensors location nudged ~0.0003° every 20–30 s. Also rehearse the negative case (1-minute session → "Not verified — too short") to prove the server checks. Honest limitation to state: peer verification raises cheating from "type a number" to "collude in person".

### Order (two devs, ~2 days)
Day 1 — A: migration 0021 (tables, RLS, helpers, create/join/invite/start), types. B: gps tracker hook, squad channel hook, live board lobby+live, start dialog, join page.
Day 2 — A: finalize RPC + realtime.send, trigger/weight changes, badge, README Q&A paragraph. B: end handshake, summary, reactions, entry points, two-device rehearsal.

---

## Verification

Unit (`npm test`): `lib/fit-window.test.ts` (red/green split within a slot, merge, min-length drop, empty hourly → yellow, past windows skipped, IST clock for a fixed UTC date, `describeWindow` formatting), `lib/nudge-rules.test.ts` (lead-time boundaries, no red nudges, stable dedupe keys, rain/streak/circle thresholds, `force` always yields one nudge).

Database (SQL editor impersonating two users): `friends_free_for_slots_for` denied to authenticated; `nudge_log` insert denied to anon; squad tables invisible to non-participants; client `insert activities source='squad'` denied; finalize fixtures: co-located 6 min → verified + badge + challenge progress ×1.3; 300 m apart → `not_colocated`; 3 min → `too_short`; solo → `solo`; 10 km/5 min → `implausible_pace` and no activity; quest squad → exactly one completion and one activity per person. Security Advisor clean.

Manual: desktop Chrome push toggle → permission → row → "Send me a test nudge" → OS notification → click deep-links to `/quest?window=…`. Android Chrome via Vercel preview: install PWA, background it, curl the cron route with `?profile=&force=1` → heads-up notification arrives, also with app closed. Cron twice in a minute → second run reports deduped, sent 0; no header → 401. Invite a friend from a quest → notification appears on the second account (bug fix). Two-device squad session end to end, plus the negative case. `npm run lint`, `npm run build` (generates `PageProps<"/squad/[id]">`), existing flows (manual log, solo GPS, quest complete, leaderboard refresh) unchanged.
