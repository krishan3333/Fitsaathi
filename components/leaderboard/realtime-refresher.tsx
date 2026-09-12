"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Subscribes to Supabase Realtime changes on a table/filter and refetches the
 * server component when anything changes — keeps leaderboards live. */
export function RealtimeRefresher({ table, filter }: { table: string; filter: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}:${filter}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, router]);

  return null;
}
