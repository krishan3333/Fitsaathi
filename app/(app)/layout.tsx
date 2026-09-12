import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppShellLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", user.id).single();
  if (profile && !profile.onboarded) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar profileId={user.id} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
