"use client";

import { useEffect } from "react";
import { Flame, MessageCircle, CloudRain, Sparkles, Trophy, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/supabase/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  circle: Trophy,
  challenge: Trophy,
  quest: Sparkles,
  weather: CloudRain,
  streak: Flame,
  invite: Bell,
  reaction: MessageCircle,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  useEffect(() => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    createClient().from("notifications").update({ is_read: true }).in("id", unreadIds).then(() => {});
  }, [notifications]);

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const Icon = ICONS[n.type] ?? Bell;
        return (
          <Card key={n.id} className={cn(!n.is_read && "border-primary/30 bg-primary/5")}>
            <CardContent className="flex items-start gap-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
