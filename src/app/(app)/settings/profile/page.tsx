import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile-edit-form";

export const metadata = { title: "Edit Profile" };

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!player) redirect("/onboarding/player");

  return (
    <main className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="text-sm text-muted-foreground">Update your player profile and photo</p>
      </div>
      <ProfileEditForm player={player} />
    </main>
  );
}
