// Generates in-app notifications for whichever Fit Window / streak / circle
// nudges apply right now. Only ever runs when a student actually opens the
// dashboard (app/(app)/page.tsx calls this) — there's no background sweep
// and no push delivery, so a student who never opens the app never gets a
// notification. Reuses the same pure engine (lib/nudge-rules.ts) that a
// prototype push-notification system used to run on a cron; only the
// delivery mechanism changed.
import type { createClient } from "./supabase/server";
import { localClock } from "./time.ts";
import { buildNudges } from "./nudge-rules.ts";
import type { FitWindow } from "./fit-window.ts";
import type { HourlyConditions } from "./weather";

export interface NudgeGeneratorInput {
  fitWindows: FitWindow[];
  hourly: HourlyConditions[];
  daysSinceActive: number;
  circleProgress: { current: number; goal: number } | null;
}

/** Best-effort: a hiccup here (a transient insert failure, say) must never
 * break the dashboard render, so every error is swallowed rather than thrown. */
export async function generateInAppNudges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  input: NudgeGeneratorInput
): Promise<void> {
  try {
    const now = localClock();
    const nudges = buildNudges({
      date: now.date,
      nowMinutes: now.minutes,
      hour: now.hour,
      windows: input.fitWindows,
      hourly: input.hourly,
      daysSinceActive: input.daysSinceActive,
      circleProgress: input.circleProgress,
    });

    for (const nudge of nudges) {
      // nudge_log's unique (profile_id, dedupe_key) is the claim: a nudge
      // already shown today fails this insert (unique_violation) and is
      // quietly skipped, so re-opening the dashboard never duplicates it.
      const { error: claimError } = await supabase.from("nudge_log").insert({ profile_id: profileId, dedupe_key: nudge.dedupeKey });
      if (claimError) continue;

      await supabase.from("notifications").insert({
        profile_id: profileId,
        title: nudge.title,
        body: nudge.body,
        type: nudge.type,
        link: nudge.link ?? null,
      });
    }
  } catch {
    /* never block the dashboard on this */
  }
}
