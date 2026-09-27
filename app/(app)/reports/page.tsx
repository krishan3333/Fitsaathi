import { Flag, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportIssueDialog } from "@/components/reports/report-issue-dialog";
import { ReviewDialog } from "@/components/reports/review-dialog";
import { MyReportsList } from "@/components/reports/my-reports-list";
import { MyReviewsList } from "@/components/reports/my-reviews-list";

async function loadReports(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: profile, error: profileError }, { data: complaints, error: complaintsError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase.from("profiles").select("college").eq("id", userId).single(),
    supabase.from("complaints").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
    supabase.from("reviews").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
  ]);
  if (profileError) throw profileError;
  if (complaintsError) throw complaintsError;
  if (reviewsError) throw reviewsError;

  let facilities: { id: string; name: string }[] = [];
  if (profile.college) {
    const { data, error } = await supabase.from("campus_locations").select("id, name").eq("college", profile.college).order("name");
    if (error) throw error;
    facilities = data ?? [];
  }

  return { complaints: complaints ?? [], reviews: reviews ?? [], facilities };
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadReports>>;
  try {
    data = await loadReports(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load your reports."} />;
  }
  const { complaints, reviews, facilities } = data;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-[1.6rem] leading-none">Reports &amp; reviews</h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">Flag an issue with a facility, coach or event, or see how your past reports and reviews are doing.</p>
        </div>
        <ReportIssueDialog
          trigger={
            <Button size="sm">
              <Flag /> Report an issue
            </Button>
          }
          facilityOptions={facilities}
        />
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">My reports</TabsTrigger>
          <TabsTrigger value="reviews">My reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="reports">
          <MyReportsList complaints={complaints} />
        </TabsContent>
        <TabsContent value="reviews">
          <div className="mb-3 flex justify-end">
            <ReviewDialog
              trigger={
                <Button size="sm" variant="outline">
                  <Star /> Review a coach
                </Button>
              }
              facilityOptions={facilities}
            />
          </div>
          <MyReviewsList reviews={reviews} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
