// Shared types/labels for Squad Sessions (live group activity with
// peer-verified logging) — used by both the squad UI (components/squad/*)
// and activity-history.tsx, which shows a squad-logged activity after the
// fact alongside manual/GPS/quest entries.
import type { Activity, SquadVerifiedReason } from "./supabase/types";

export const VERIFIED_REASON_LABELS: Record<SquadVerifiedReason, string> = {
  no_gps_fix: "No GPS fix",
  too_short: "Session was too short",
  implausible_pace: "Pace wasn't plausible",
  solo: "Nobody else was in this session",
  not_colocated: "Not colocated with the group",
};

/** The label activity-history.tsx (and the squad summary screen) show for a
 * finished squad activity. peer_verified only ever applies to source='squad'
 * — it's the one trust level the server actually cross-checked against
 * another participant's GPS trace, not just a plausible pace on its own. */
export function trustLabel(activity: Pick<Activity, "source" | "peer_verified">): string {
  if (activity.source !== "squad") return activity.source;
  return activity.peer_verified ? "Peer-verified" : "Squad (unverified)";
}
