"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function StartSafetySessionCard({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [shareLocation, setShareLocation] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("safety_sessions").insert({ profile_id: profileId, share_location: shareLocation });
    setCreating(false);
    if (error) {
      setError("Couldn't start a safety session — try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start a safety session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Keep a session running while you&apos;re out. You can stop it, or hit SOS, any time.</p>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">Share live location</p>
            <p className="text-xs text-muted-foreground">Only ever visible to you, unless you trigger SOS</p>
          </div>
          <Switch checked={shareLocation} onCheckedChange={setShareLocation} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" disabled={creating} onClick={start}>
          {creating ? <Loader2 className="animate-spin" /> : <Play />}
          Start session
        </Button>
      </CardContent>
    </Card>
  );
}
