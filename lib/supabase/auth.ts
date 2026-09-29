import { cache } from "react";
import { createClient } from "./server";

// Verifies the session JWT locally (getClaims) instead of a network round trip
// to Supabase Auth (getUser) — the proxy already validates/refreshes the
// session on every request. cache() dedupes it across layout + page per request.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  return id ? { id } : null;
});
