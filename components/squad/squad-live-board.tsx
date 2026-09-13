"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Square, Loader2, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { estimateStepsFromDistance } from "@/lib/geo";
import { useGpsTracker } from "@/lib/use-gps-tracker";
import { useSquadChannel, type SquadFinalizeResult } from "@/lib/use-squad-channel";
import { Button } from "@/components/ui/button";
import { SquadRoster, type RosterMember } from "@/components/squad/squad-roster";
import { SquadReactions } from "@/components/squad/squad-reactions";
import { SquadSummary } from "@/components/squad/squad-summary";
import { SquadInviteDialog } from "@/components/squad/squad-invite-dialog";
import type { SquadActivityType, SquadParticipant, SquadStatus } from "@/lib/supabase/types";

const PROGRESS_INTERVAL_MS = 5000;
const CHECKPOINT_INTERVAL_MS = 60000;
const END_HANDSHAKE_TIMEOUT_MS = 8000;

export function SquadLiveBoard({
  sessionId,
  joinCode,
  hostId,
  currentProfileId,
  activityType,
  initialStatus,
  initialMembers,
  initialResults,
}: {
  sessionId: string;
  joinCode: string;
  hostId: string;
  currentProfileId: string;
  activityType: SquadActivityType;
  initialStatus: SquadStatus;
  initialMembers: RosterMember[];
  initialResults?: SquadFinalizeResult[] | null;
}) {
  const router = useRouter();
  const isHost = currentProfileId === hostId;
  const tracker = useGpsTracker();
  const channel = useSquadChannel(
    sessionId,
    currentProfileId,
    initialStatus === "ended" ? "summary" : initialStatus === "live" ? "live" : "lobby"
  );
  const [members] = useState<RosterMember[]>(initialMembers);
  const [ending, setEnding] = useState(false);
  const startedFixSentRef = useRef(false);

  const results = channel.results ?? initialResults ?? null;
  const phase = results && channel.phase !== "summary" ? "summary" : channel.phase;

  async function checkpoint(final: boolean) {
    const supabase = createClient();
    const payload: Partial<SquadParticipant> = {
      distance_km: Number(tracker.distanceKm.toFixed(2)),
      steps: estimateStepsFromDistance(tracker.distanceKm),
      active_minutes: Math.round(tracker.elapsedSec / 60),
      last_checkpoint_at: new Date().toISOString(),
    };
    if (!startedFixSentRef.current && tracker.startPoint) {
      payload.start_lat = tracker.startPoint.lat;
      payload.start_lng = tracker.startPoint.lng;
      startedFixSentRef.current = true;
    }
    if (final) {
      if (tracker.lastPoint) {
        payload.end_lat = tracker.lastPoint.lat;
        payload.end_lng = tracker.lastPoint.lng;
      }
      payload.left_at = new Date().toISOString();
    }
    await supabase.from("squad_participants").update(payload).eq("session_id", sessionId).eq("profile_id", currentProfileId);
  }

  // Live loop: broadcast progress every 5s, checkpoint to the DB every 60s —
  // see the Day-1/Day-2 design note in supabase/migrations/0021: checkpoints
  // are what finalize_squad_session reads, broadcasts are just for the board.
  useEffect(() => {
    if (phase !== "live" || tracker.status !== "tracking") return;
    const progressTimer = setInterval(() => {
      channel.sendProgress({ distanceKm: tracker.distanceKm, steps: estimateStepsFromDistance(tracker.distanceKm), elapsedSec: tracker.elapsedSec });
    }, PROGRESS_INTERVAL_MS);
    const checkpointTimer = setInterval(() => checkpoint(false), CHECKPOINT_INTERVAL_MS);
    return () => {
      clearInterval(progressTimer);
      clearInterval(checkpointTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tracker.status]);

  // First fix: checkpoint immediately so start_lat/lng lands as soon as possible.
  useEffect(() => {
    if (phase === "live" && tracker.startPoint && !startedFixSentRef.current) checkpoint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tracker.startPoint]);

  // End handshake: everyone (including the host) reacts to end_requested by
  // saving their final checkpoint and announcing it; the host alone waits
  // for the roster to catch up (or a timeout) and then finalizes.
  useEffect(() => {
    if (phase !== "ending") return;
    let cancelled = false;
    (async () => {
      tracker.stop();
      await checkpoint(true);
      if (!cancelled) channel.sendFinalSaved();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!isHost || phase !== "ending") return;
    const everyoneSaved = members.every((m) => channel.savedProfiles.has(m.profileId));
    const finalize = async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("finalize_squad_session", { p_session_id: sessionId });
      channel.setResultsFromRpc(
        (data ?? []).map((r) => ({
          profileId: r.profile_id,
          verified: r.verified,
          verifiedReason: r.verified_reason,
          distanceKm: Number(r.distance_km),
          steps: r.steps,
          activeMinutes: r.active_minutes,
        }))
      );
    };
    if (everyoneSaved) {
      finalize();
      return;
    }
    const timeout = setTimeout(finalize, END_HANDSHAKE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channel.savedProfiles]);

  async function startSession() {
    const supabase = createClient();
    const { error } = await supabase.rpc("start_squad_session", { p_session_id: sessionId });
    if (error) return;
    tracker.start();
    channel.sendStarted(new Date().toISOString());
  }

  function requestEnd() {
    setEnding(true);
    channel.sendEndRequested();
  }

  async function cancelSession() {
    const supabase = createClient();
    await supabase.rpc("cancel_squad_session", { p_session_id: sessionId });
    router.push("/squad");
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="display text-[1.35rem] capitalize leading-none">Squad {activityType}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
            {channel.status === "connected" ? (
              <>
                <Wifi className="size-3.5 text-success" /> Live
              </>
            ) : (
              <>
                <WifiOff className="size-3.5" /> Reconnecting…
              </>
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.push("/squad")} aria-label="Close">
          <X />
        </Button>
      </div>

      {phase === "lobby" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border px-4 py-3.5">
            <p className="text-[0.72rem] text-muted-foreground">Share this code to let friends join</p>
            {/* letter-spacing inline: .metric also sets tracking, and both land
                in the same cascade layer, so a utility class wouldn't reliably win. */}
            <p className="metric mt-1.5 text-[1.75rem]" style={{ letterSpacing: "0.12em" }}>
              {joinCode}
            </p>
          </div>
          <SquadRoster members={members} onlineIds={channel.members} hostId={hostId} />
          <SquadInviteDialog sessionId={sessionId} joinCode={joinCode} trigger={<Button variant="outline" className="w-full">Invite more people</Button>} />
          {isHost ? (
            <Button className="w-full" onClick={startSession}>
              <Play /> Start session
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Waiting for the host to start…</p>
          )}
          {isHost && (
            <Button variant="ghost" className="w-full text-danger" onClick={cancelSession}>
              Cancel session
            </Button>
          )}
        </div>
      )}

      {phase === "live" && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border px-4 py-5 text-center">
              <p className="metric text-[2.4rem]">{tracker.distanceKm.toFixed(2)}</p>
              <p className="mt-2 text-[0.72rem] text-muted-foreground">kilometres</p>
            </div>
            <div className="rounded-2xl border border-border px-4 py-5 text-center">
              <p className="metric text-[2.4rem]">
                {String(Math.floor(tracker.elapsedSec / 60)).padStart(2, "0")}:{String(tracker.elapsedSec % 60).padStart(2, "0")}
              </p>
              <p className="mt-2 text-[0.72rem] text-muted-foreground">elapsed</p>
            </div>
          </div>
          {tracker.status === "error" && <p className="text-center text-sm text-danger">{tracker.error}</p>}
          <SquadRoster members={members} onlineIds={channel.members} hostId={hostId} progress={channel.progress} />
          <SquadReactions onReact={channel.sendReaction} recent={channel.reactions} />
          <div className="flex-1" />
          {isHost && (
            <Button variant="destructive" className="w-full" onClick={requestEnd} disabled={ending}>
              <Square /> End session
            </Button>
          )}
        </div>
      )}

      {phase === "ending" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Saving everyone&apos;s result…</p>
        </div>
      )}

      {phase === "summary" && results && <SquadSummary results={results} members={members} />}
    </div>
  );
}
