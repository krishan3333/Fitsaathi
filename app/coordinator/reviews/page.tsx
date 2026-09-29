import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { ReviewsModerationList, type ReviewRow } from "@/components/coordinator/reviews-moderation-list";

async function loadReviews(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const isCoordinator = me?.role === "coordinator";
  if (!isCoordinator) return { isCoordinator, reviews: [] as ReviewRow[] };

  const { data: rows, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const profileIds = [...new Set((rows ?? []).map((r) => r.profile_id))];
  const { data: authors } = profileIds.length ? await supabase.from("public_profiles").select("id, name").in("id", profileIds) : { data: [] };
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.name]));

  const reviews = (rows ?? []).map((r) => ({ ...r, authorName: nameById.get(r.profile_id) ?? "Unknown" }));
  return { isCoordinator, reviews };
}

export default async function CoordinatorReviewsPage() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadReviews>>;
  try {
    data = await loadReviews(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load reviews."} />;
  }
  const { isCoordinator, reviews } = data;

  if (!isCoordinator) {
    return <EmptyState icon={Building2} title="Coordinator access only" description="Sign in with a campus coordinator account to view this page." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate facility and coach reviews from your college.</p>
      </div>
      <ReviewsModerationList reviews={reviews} />
    </div>
  );
}
