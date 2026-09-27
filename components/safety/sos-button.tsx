"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircleWarning, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mapsLink, sosMessage, smsHref, whatsappHref } from "@/lib/safety";
import type { TrustedContact } from "@/lib/supabase/types";

export function SosButton({
  sessionId,
  studentName,
  contacts,
  coords,
}: {
  sessionId: string;
  studentName: string;
  contacts: TrustedContact[];
  coords: { lat: number; lng: number } | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fireSos() {
    setTriggering(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("trigger_sos", {
      p_session_id: sessionId,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
    });
    setTriggering(false);
    if (error) {
      setError("Couldn't reach the server — try again, or contact someone directly right now.");
      return;
    }
    setTriggered(true);
    router.refresh();
  }

  const mapsUrl = coords ? mapsLink(coords.lat, coords.lng) : null;
  const message = sosMessage(studentName, mapsUrl);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <Button variant="destructive" size="lg" className="w-full" onClick={() => setConfirming(true)}>
        <ShieldAlert /> SOS
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{triggered ? "SOS sent" : "Trigger SOS?"}</DialogTitle>
            <DialogDescription>
              {triggered
                ? "Campus coordinators have been notified with your last known location. Now alert your trusted contacts directly below — each opens your own phone's messaging app."
                : "This notifies your campus's coordinators in-app with your last known location. It does not contact police or emergency services — this app has no connection to either."}
            </DialogDescription>
          </DialogHeader>

          {!triggered && (
            <Button variant="destructive" className="w-full" disabled={triggering} onClick={fireSos}>
              {triggering ? <Loader2 className="animate-spin" /> : <ShieldAlert />}
              Confirm SOS
            </Button>
          )}

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}

          {triggered && (
            <div className="mt-2 space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">You haven&apos;t added any trusted contacts yet — add some from the Safety page next time.</p>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5">
                    <p className="text-sm font-medium">{c.name}</p>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={smsHref(c.phone, message)}>
                          <MessageCircleWarning /> SMS
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={whatsappHref(c.phone, message)} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
              {canShare && (
                <Button variant="ghost" className="w-full" onClick={() => navigator.share({ text: message }).catch(() => {})}>
                  Share via another app
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
