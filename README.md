# Moveup

**Fitness that fits student life.**

A student fitness and sports PWA built for Smart India Hackathon Problem ID 26196.
Moveup motivates students through friends, fits fitness into their timetable,
and guides them to the best place and time to stay active — through friend
challenges with live leaderboards, a rule-based smart quest planner (with
optional Gemini-generated personal quests layered on top, never in charge of
selection), a weather/AQI-aware campus activity map (FitRoute), in-app Fit
Window nudges, and live, peer-verified Squad Sessions.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres, Realtime, Storage
- MapLibre GL + OpenStreetMap for the campus map
- Recharts for progress/activity charts
- Open-Meteo for weather + air quality (no API key required)
- Google Gemini (optional) for personal quest *content* generation — see
  `lib/quest-generator.ts`; selection logic stays rule-based either way
- Installable PWA (manifest, offline cache, app icons), light/dark theme

## Project structure

```
app/                    Routes (App Router)
  (app)/                Authenticated student shell (bottom nav + top bar)
    page.tsx            Home dashboard
    challenges/         Fit Circles, challenges, leaderboards
    quest/              Smart Fitness Quest planner
    fitroute/           Campus map + Green Window + GPS sessions
    squad/              Live, peer-verified Squad Sessions
    profile/            Profile, stats, privacy & settings
    notifications/      Notification centre
  coordinator/          Desktop-friendly coordinator dashboard (separate layout)
  login/, signup/, onboarding/
  api/                  weather (Open-Meteo+AQI proxy), nearby-places (OSM),
                        quests/generate (Gemini quest content)
components/             UI split by feature area (dashboard, challenges, quests,
                        fitroute, leaderboard, squad, coordinator, profile, ui, layout)
lib/                    supabase/ clients+types, quest-engine + quest-generator,
                        weather, geo, activity-stats, quest-context, time,
                        fit-window + nudge-rules + nudge-generator (Fit Window
                        nudges), squad + use-gps-tracker + use-squad-channel
                        (Squad Sessions), utils
supabase/
  migrations/           SQL schema, RLS policies, triggers, coordinator RPCs
  seed.sql              Campus content (quests, locations, badges) — no fake users
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run every file in `supabase/migrations/` in order
   (`0001_init.sql`, `0002_...`, ... through the highest-numbered file).
3. Run `supabase/seed.sql` to load the campus content library — the quest
   catalogue, FitRoute locations, and badge definitions. It creates **no user
   accounts**: students sign up through the app itself.

> **Never create users by inserting into `auth.users` directly.** Several
> columns there (`confirmation_token`, `recovery_token`, `email_change`,
> `email_change_token_new`) have no default, and Supabase Auth cannot
> deserialize a row where they are `NULL` — every login for that user then fails
> with a generic *"Database error querying schema"*. Use the signup flow, the
> Dashboard's **Add user**, or the Admin API instead.

If you're using the Supabase CLI instead of the dashboard SQL editor:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
psql "<connection-string>" -f supabase/seed.sql
```

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=            # Project Settings → API
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=# Project Settings → API (anon/publishable key)
NEXT_PUBLIC_MAPTILER_KEY=            # optional — vector map style; omit to use free OSM raster tiles
AQI_API_KEY=                         # optional — reserved for a keyed AQI provider; Open-Meteo's free AQI API is used by default
GEMINI_API_KEY=                      # optional — get one free at aistudio.google.com/apikey; without it,
                                      # personal quest generation just falls back to the static catalogue
```

Without Supabase configured, pages still render with proper loading/error states
(there's a placeholder client so nothing crashes at build/import time) — but you
need a real project to sign up, log in, and see live data.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, create an account, and you'll be walked through
onboarding (campus, goal, fitness level, preferred activities, free timetable
slots) before landing on your dashboard.

**For demos, turn off email confirmation** so signups work instantly:
Dashboard → **Authentication → Providers → Email** → uncheck *Confirm email*.
Otherwise every new account has to click a link before it can log in, and
Supabase's built-in SMTP is heavily rate-limited.

### Optional: Google sign-in

The login and signup screens include a "Continue with Google" button. To enable it:

1. Create OAuth credentials in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type: *Web application*).
2. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
3. In Supabase: **Authentication → Providers → Google**, enable it and paste the
   client ID and secret.

Until it's enabled, the button shows a clear "not enabled for this project"
message instead of failing silently. Email/password works regardless.

### Granting coordinator access

Everyone signs up as a student. To give someone the campus coordinator dashboard
at `/coordinator`, promote their account after they've signed up:

```sql
update profiles set role = 'coordinator'
where id = (select id from auth.users where email = 'you@college.edu');
```

### 5. Tests

The rule-based quest planner (`lib/quest-engine.ts`) and the Fit Window /
nudge engines (`lib/fit-window.ts`, `lib/nudge-rules.ts`) have unit tests:

```bash
npm test
```

## Fit Window nudges (in-app only)

The app spots when a student's free timetable slot, good weather/AQI, and
free circle-mates line up ("Free 5:30–6:00 PM, AQI 78, Aditi & Imran are free.
Group walk?") and surfaces it — but only ever as an in-app notification,
generated the moment the student opens the dashboard. There is no background
delivery: no push subscriptions, no OS notifications, no service-role key, no
cron job. A student who never opens the app never gets a notification.

- `lib/fit-window.ts` — which of today's free slots are actually good (pure,
  unit-tested).
- `lib/nudge-rules.ts` — which nudge fires given those windows plus streak/
  circle context (pure, unit-tested).
- `lib/nudge-generator.ts` — called once from `app/(app)/page.tsx` on every
  dashboard load; runs `buildNudges()` and inserts any new ones into
  `notifications`, using `nudge_log`'s unique `(profile_id, dedupe_key)` as a
  same-day dedupe claim so re-opening the dashboard doesn't duplicate them.
  Uses the caller's own RLS-scoped session throughout — never elevated
  privileges — since it only ever acts on the signed-in student's own data.

The **Notifications** toggle in Profile → Settings controls whether this
runs at all for that student. To try it: adjust your free slots/timetable so
a window lines up with "now" in your testing timezone, open the dashboard,
and check the **Notifications** tab.

## Squad Sessions

A live group walk/run/cycle (or quest) where everyone's progress streams to a
shared board in real time, and finishing together gets the activity stamped
**peer-verified** — the server checks the group was actually colocated
(everyone's start and end GPS fixes within 150m, ≥5 min of overlapping
session time), not just that the numbers look plausible. Peer-verified
activity counts more toward challenge progress than a solo GPS log.

- Schema, RLS, and every RPC (create/join/invite/start/cancel/finalize) live
  in `supabase/migrations/0021_squad_sessions.sql` — no client ever inserts
  into `squad_sessions`/`squad_participants` directly.
- `finalize_squad_session` labels each participant `verified_reason` when it
  isn't peer-verified: `no_gps_fix`, `too_short` (< 5 min), `implausible_pace`
  (and in that one case, no activity is logged at all — same anti-cheat pace
  ceilings as GPS routes), `solo` (nobody else had fixes either), or
  `not_colocated`.
- Realtime uses a private channel (`squad:<session-id>`), authorized by RLS
  policies on `realtime.messages` (`is_squad_member(...)`) — see the bottom of
  the migration. This requires a Supabase project with Realtime's Broadcast
  Authorization feature (the `realtime.messages` table); if your project
  predates it, upgrade the Realtime service in the dashboard.
- `lib/use-gps-tracker.ts` drives live tracking (shared with the plain GPS
  route dialog): fixes worse than 50m accuracy are dropped, and movement
  under 3m between fixes doesn't count as distance, so standing still doesn't
  slowly accumulate fake steps.

To try it: **Squad** tab (bottom nav / dashboard quick action) → **Start**,
pick an activity, then **Invite to squad** to share the join code — a second
account joins via **Join by code** or the shared link. On a phone, run
`npx next dev --experimental-https -H 0.0.0.0` so a second device on the same
network can reach it over HTTPS (required for GPS). Worth rehearsing the
negative case too: end a session after under a minute and confirm it comes
back "Not verified — too short" instead of silently succeeding.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the same environment variables from `.env.local` in the Vercel project
   settings.
4. Deploy. The PWA manifest, icons, and service worker are already wired up —
   installable on first visit.

## Notes on scope

- **Not built, by design:** AI camera form-checking, medical features, parent
  dashboards, complaint systems, talent scouting, government integrations.
- **Quest planner** is a plain rule-based engine (`lib/quest-engine.ts`) — no
  LLM/chatbot involved. Gemini only ever generates the *content* of a personal
  quest (`lib/quest-generator.ts`); which quest gets recommended when is still
  decided by the same rules for every quest, hand-written or generated.
- **Steps** are self-reported (manual entry, completed quests, GPS-tracked
  distance, or a peer-verified Squad Session) — the app never claims
  browser-pedometer accuracy. `activities.source` (`manual` / `quest` /
  `gps_route` / `squad`, the last with its own `peer_verified` flag) keeps
  that distinction, weighted accordingly in challenge progress (`0013_anti_cheat.sql`,
  `0021_squad_sessions.sql`). Android Health Connect can plug in as a fifth
  source later without changing the schema.
- **Coordinators** only ever see anonymized, aggregated stats — enforced at the
  database layer via `SECURITY DEFINER` RPCs (`coordinator_overview`,
  `coordinator_department_leaderboard`, `coordinator_route_usage`), not just
  hidden in the UI.
