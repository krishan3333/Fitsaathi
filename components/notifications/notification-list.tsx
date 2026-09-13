"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Flame, MessageCircle, CloudRain, Sparkles, Trophy, Bell, Users } from "lucide-react";
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
  squad: Users,
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
        const body = (
          <CardContent className="flex items-start gap-3.5 p-4">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                n.is_read ? "bg-muted text-muted-foreground ring-border" : "bg-primary/10 text-primary ring-primary/20"
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium tracking-[-0.01em]">{n.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">{timeAgo(n.created_at)}</p>
            </div>
          </CardContent>
        );
        return (
          <Card
            key={n.id}
            className={cn("transition-colors", !n.is_read && "border-primary/25 bg-primary/[0.04]", n.link && "hover:border-foreground/20")}
          >
            {n.link ? <Link href={n.link}>{body}</Link> : body}
          </Card>
        );
      })}
    </div>
  );
}
