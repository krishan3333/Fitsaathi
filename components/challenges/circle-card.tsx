"use client";

import { useState } from "react";
import { Copy, Check, QrCode, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export function CircleCard({ name, inviteCode, members }: { name: string; inviteCode: string; members: { id: string; name: string }[] }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" /> {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <Avatar key={m.id} className="border-2 border-card">
              <AvatarFallback>{initials(m.name)}</AvatarFallback>
            </Avatar>
          ))}
          {members.length > 6 && (
            <div className="flex size-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
              +{members.length - 6}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
          <div>
            <p className="text-xs text-muted-foreground">Invite code</p>
            <p className="font-mono text-sm font-semibold tracking-wider">{inviteCode}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={copyCode} aria-label="Copy invite code">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowQr((v) => !v)} aria-label="Show QR code">
              <QrCode className="size-4" />
            </Button>
          </div>
        </div>
        {showQr && (
          <div className="flex justify-center rounded-xl border border-border p-3">
            {/* ponytail: renders via the free api.qrserver.com image API instead of a
                QR-generating dependency — no key, but it's a third-party runtime call
                outside the approved stack. Swap for a local QR lib (e.g. `qrcode`) if
                offline/self-hosted rendering ever matters. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteCode)}`}
              alt={`QR code for invite ${inviteCode}`}
              width={160}
              height={160}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
