# FitSaathi

**Fitness that fits student life.**

A student fitness and sports PWA built for Smart India Hackathon Problem ID 26196.
FitSaathi motivates students through friends, fits fitness into their timetable,
and guides them to the best place and time to stay active — through friend
challenges with live leaderboards, a rule-based smart quest planner, and a
weather/AQI-aware campus activity map (FitRoute).

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Auth, Postgres, Realtime, Storage
- MapLibre GL + OpenStreetMap for the campus map
- Recharts for progress/activity charts
- Open-Meteo for weather + air quality (no API key required)
- Installable PWA (manifest, offline cache, app icons)

## Project structure

```
app/                    Routes (App Router)
  (app)/                Authenticated student shell (bottom nav + top bar)
    page.tsx            Home dashboard
    challenges/         Fit Circles, challenges, leaderboards
    quest/              Smart Fitness Quest planner
    fitroute/           Campus map + Green Window + GPS sessions
    profile/            Profile, stats, privacy & settings
    notifications/      Notification centre
  coordinator/          Desktop-friendly coordinator dashboard (separate layout)
  login/, signup/, onboarding/
  api/weather/route.ts  Open-Meteo + AQI proxy endpoint
components/             UI split by feature area (dashboard, challenges, quests,
                        fitroute, leaderboard, coordinator, profile, ui, layout)
lib/                    supabase/ clients+types, quest-engine, weather, geo,
                        activity-stats, quest-context, utils
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
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_init.sql` — schema + RLS policies
   - `supabase/migrations/0002_activity_triggers.sql` — streaks, badges, challenge progress
   - `supabase/migrations/0003_storage.sql` — `avatars` storage bucket + policies
   - `supabase/migrations/0004_coordinator_broadcast.sql` — announcement RPC
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

The rule-based quest planner (`lib/quest-engine.ts`) has a small self-check:

```bash
npm test
```

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
  LLM/chatbot involved.
- **Steps** are self-reported (manual entry, completed quests, or GPS-tracked
  distance converted to an estimate) — the app never claims browser-pedometer
  accuracy. `activities.source` (`manual` / `quest` / `gps_route`) keeps that
  distinction, and Android Health Connect can plug in as a fourth source later
  without changing the schema.
- **Coordinators** only ever see anonymized, aggregated stats — enforced at the
  database layer via `SECURITY DEFINER` RPCs (`coordinator_overview`,
  `coordinator_department_leaderboard`, `coordinator_route_usage`), not just
  hidden in the UI.
