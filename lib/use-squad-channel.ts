"use client";

// The realtime backbone for a live Squad Session: a private channel
// "squad:<sessionId>", authorized by the RLS policies on realtime.messages
// added in 0021_squad_sessions.sql (is_squad_member(...)). Presence tracks
// who's actually connected (the roster); broadcast carries live progress,
// the end-of-session handshake, and reactions; the one Postgres-sent event
// ("finalized", from finalize_squad_session's realtime.send) arrives the
// same way broadcast does, since it's on the same channel/topic.
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export type SquadChannelStatus = "connecting" | "connected" | "error";
export type SquadPhase = "lobby" | "live" | "ending" | "summary";

export interface SquadProgress {
  distanceKm: number;
  steps: number;
  elapsedSec: number;
}

export interface SquadReaction {
  profileId: string;
  emoji: string;
  at: number;
}

export interface SquadFinalizeResult {
  profileId: string;
  verified: boolean;
  verifiedReason: string | null;
  distanceKm: number;
  steps: number;
  activeMinutes: number;
}

export function useSquadChannel(sessionId: string, profileId: string, initialPhase: SquadPhase = "lobby") {
  const [status, setStatus] = useState<SquadChannelStatus>("connecting");
  const [phase, setPhase] = useState<SquadPhase>(initialPhase);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, SquadProgress>>({});
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<SquadFinalizeResult[] | null>(null);
  const [reactions, setReactions] = useState<SquadReaction[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`squad:${sessionId}`, {
      config: { private: true, broadcast: { self: true }, presence: { key: profileId } },
    });

    channel
      .on("broadcast", { event: "started" }, ({ payload }) => {
        setPhase("live");
        setStartedAt(payload.startedAt);
      })
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        setProgress((p) => ({ ...p, [payload.profileId]: payload.progress }));
      })
      .on("broadcast", { event: "end_requested" }, () => setPhase("ending"))
      .on("broadcast", { event: "final_saved" }, ({ payload }) => {
        setSavedProfiles((s) => new Set(s).add(payload.profileId));
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        setReactions((r) => [...r, payload as SquadReaction].slice(-20));
      })
      .on("broadcast", { event: "finalized" }, ({ payload }) => {
        setPhase("summary");
        setResults(
          (payload.results as Array<{ profileId: string; verified: boolean; verifiedReason: string | null; distanceKm: number; steps: number; activeMinutes: number }>).map((r) => ({
            profileId: r.profileId,
            verified: r.verified,
            verifiedReason: r.verifiedReason,
            distanceKm: r.distanceKm,
            steps: r.steps,
            activeMinutes: r.activeMinutes,
          }))
        );
      })
      .on("presence", { event: "sync" }, () => {
        setMembers(Object.keys(channel.presenceState()));
      })
      .subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setStatus("connected");
          channel.track({ profileId, online_at: Date.now() });
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setStatus("error");
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, profileId]);

  function send<T extends object>(event: string, payload: T) {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }

  return {
    status,
    phase,
    startedAt,
    members,
    progress,
    savedProfiles,
    results,
    reactions,
    setPhase,
    /** Host only, so every client (including the host's own) transitions to 'live' together. */
    sendStarted: (startedAtIso: string) => send("started", { startedAt: startedAtIso }),
    sendProgress: (p: SquadProgress) => send("progress", { profileId, progress: p }),
    /** Host only — kicks off the end handshake (everyone saves their final checkpoint). */
    sendEndRequested: () => send("end_requested", {}),
    sendFinalSaved: () => send("final_saved", { profileId }),
    sendReaction: (emoji: string) => send("reaction", { profileId, emoji, at: Date.now() }),
    /** The host gets its own finalize_squad_session RPC result directly —
     * no need to wait for the DB broadcast round-trip back to itself. */
    setResultsFromRpc: (rows: SquadFinalizeResult[]) => {
      setResults(rows);
      setPhase("summary");
    },
  };
}
