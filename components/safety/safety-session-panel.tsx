"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Radio, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocationWatch } from "@/lib/use-location-watch";
import { SosButton } from "@/components/safety/sos-button";
import { SAFETY_STATUS_LABELS } from "@/lib/safety";
import type { SafetySession, TrustedContact } from "@/lib/supabase/types";

export function SafetySessionPanel({ session, studentName, contacts }: { session: SafetySession; studentName: string; contacts: TrustedContact[] }) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const watch = useLocationWatch(session.share_location && session.status !== "ended");

  useEffect(() => {
    if (watch.status !== "watching") return;
    const supabase = createClient();
    supabase
      .from("safety_sessions")
      .update({ last_lat: watch.coords.lat, last_lng: watch.coords.lng, last_location_at: new Date().toISOString() })
      .eq("id", session.id)
      .then(() => {});
    // Fires whenever watchPosition reports a new fix — watch.at changes each
    // time even if coords are identical, which is what we want to key on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch.status === "watching" ? watch.at : null]);

  async function endSession() {
    setEnding(true);
    const supabase = createClient();
    await supabase.from("safety_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
    setEnding(false);
    router.refresh();
  }

  const coords =
    watch.status === "watching"
      ? watch.coords
      : session.last_lat != null && session.last_lng != null
        ? { lat: session.last_lat, lng: session.last_lng }
        : null;

  return (
    <Card className={session.status === "sos" ? "border-danger/40 bg-danger/[0.04]" : "border-primary/25 bg-primary/[0.04]"}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{SAFETY_STATUS_LABELS[session.status]}</CardTitle>
        <Badge variant={session.status === "sos" ? "danger" : "success"}>
          <Radio className="animate-pulse" /> Live
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Started {new Date(session.started_at).toLocaleTimeString()}</p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {session.share_location
              ? watch.status === "watching"
                ? "Sharing your live location"
                : watch.status === "error"
                  ? watch.message
                  : "Waiting for a location fix…"
              : "Location sharing is off for this session"}
          </p>
        </div>

        <SosButton sessionId={session.id} studentName={studentName} contacts={contacts} coords={coords} />

        <Button variant="outline" className="w-full" disabled={ending} onClick={endSession}>
          {ending ? <Loader2 className="animate-spin" /> : <Square />}
          End session
        </Button>
      </CardContent>
    </Card>
  );
}
