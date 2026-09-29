import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ErrorState } from "@/components/ui/empty-state";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import type { Profile } from "@/lib/supabase/types";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) redirect("/login");

  let profile: Profile;
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    profile = data;
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load your profile."} />;
  }

  return <EditProfileForm profile={profile} />;
}
