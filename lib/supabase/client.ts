"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Falls back to a placeholder project so the app renders (with empty/error
// states) even before NEXT_PUBLIC_SUPABASE_* is configured, instead of
// crashing at import time.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export function createClient() {
  return createBrowserClient<Database>(url, key);
}
