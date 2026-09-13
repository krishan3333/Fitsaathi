"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, QrCode, Users, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";

export function CircleCard({
  id,
  name,
  inviteCode,
  members,
  canDelete,
}: {
  id: string;
  name: string;
  inviteCode: string;
  members: { id: string; name: string; avatarUrl: string | null }[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function deleteCircle() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setDeleteError(null);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("fit_circles").delete().eq("id", id).select("id");
    setDeleting(false);
    setConfirmingDelete(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setDeleteError("You don't have permission to delete this circle.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> {name}
          </span>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-7", confirmingDelete ? "text-danger" : "text-muted-foreground")}
              disabled={deleting}
              onClick={deleteCircle}
              title={confirmingDelete ? "Tap again to confirm delete" : "Delete circle"}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <Avatar key={m.id} className="border-2 border-card">
              <AvatarImage src={m.avatarUrl ?? undefined} alt={m.name} />
              <AvatarFallback>{initials(m.name)}</AvatarFallback>
            </Avatar>
          ))}
          {members.length > 6 && (
            <div className="flex size-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
              +{members.length - 6}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-muted px-3.5 py-2.5">
          <div>
            <p className="text-[0.7rem] text-muted-foreground">Invite code</p>
            <p className="metric-sm text-[1.05rem]" style={{ letterSpacing: "0.1em" }}>{inviteCode}</p>
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
