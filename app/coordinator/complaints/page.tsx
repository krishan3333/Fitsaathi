import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { ComplaintsList, type ComplaintRow } from "@/components/coordinator/complaints-list";

async function loadComplaints(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const isCoordinator = me?.role === "coordinator";
  if (!isCoordinator) return { isCoordinator, complaints: [] as ComplaintRow[] };

  const { data: rows, error } = await supabase.from("complaints").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const profileIds = [...new Set((rows ?? []).map((r) => r.profile_id))];
  const { data: reporters } = profileIds.length ? await supabase.from("public_profiles").select("id, name").in("id", profileIds) : { data: [] };
  const nameById = new Map((reporters ?? []).map((r) => [r.id, r.name]));

  const complaints = (rows ?? []).map((r) => ({ ...r, reporterName: nameById.get(r.profile_id) ?? "Unknown" }));
  return { isCoordinator, complaints };
}

export default async function CoordinatorComplaintsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadComplaints>>;
  try {
    data = await loadComplaints(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load complaints."} />;
  }
  const { isCoordinator, complaints } = data;

  if (!isCoordinator) {
    return <EmptyState icon={Building2} title="Coordinator access only" description="Sign in with a campus coordinator account to view this page." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Complaints</h1>
        <p className="text-sm text-muted-foreground">Reports from students at your college.</p>
      </div>
      <ComplaintsList complaints={complaints} coordinatorId={user.id} />
    </div>
  );
}
