import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { TrustedContactsManager } from "@/components/safety/trusted-contacts-manager";
import { StartSafetySessionCard } from "@/components/safety/start-safety-session-card";
import { SafetySessionPanel } from "@/components/safety/safety-session-panel";

async function loadSafety(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: profile, error: profileError }, { data: contacts, error: contactsError }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId).single(),
    supabase.from("trusted_contacts").select("*").eq("profile_id", userId).order("created_at"),
    supabase.from("safety_sessions").select("*").eq("profile_id", userId).in("status", ["active", "sos"]).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (contactsError) throw contactsError;
  if (sessionError) throw sessionError;

  return { profile, contacts: contacts ?? [], session };
}

export default async function SafetyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadSafety>>;
  try {
    data = await loadSafety(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load Safety."} />;
  }
  const { profile, contacts, session } = data;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="display flex items-center gap-2 text-[1.6rem] leading-none">
          <ShieldCheck className="size-6 text-primary" /> Safety
        </h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          Start a session before you head out, optionally share your live location with it, and hit SOS if you ever need help fast. Your location and
          contacts are never visible to anyone but you unless you trigger SOS.
        </p>
      </div>

      {session ? <SafetySessionPanel session={session} studentName={profile.name} contacts={contacts} /> : <StartSafetySessionCard profileId={user.id} />}

      <TrustedContactsManager profileId={user.id} initialContacts={contacts} />
    </div>
  );
}
