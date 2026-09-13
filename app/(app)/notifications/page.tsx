import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/lib/supabase/types";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let notifications: Notification[];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    notifications = data ?? [];
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load notifications."} />;
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="display text-[1.6rem] leading-none">Notifications</h1>
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You&apos;re all caught up" description="Challenge updates, quest nudges, and streak reminders show up here." />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
