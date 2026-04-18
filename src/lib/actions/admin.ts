"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AdminActionState = {
  error?: string;
  success?: boolean;
};

/** Update a player's membership (role, team_name, jersey_number) — league admin or master only */
export async function updateMembership(
  membershipId: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = formData.get("role") as string;
  const teamName = formData.get("team_name") as string;
  const jerseyNumber = formData.get("jersey_number") as string;
  const canScore = formData.get("can_score") === "on";

  const updates: Record<string, any> = {};
  if (role) updates.role = role;
  if (teamName !== null) updates.team_name = teamName || null;
  if (jerseyNumber !== null) updates.jersey_number = jerseyNumber || null;
  updates.can_score = canScore;

  const { error } = await supabase
    .from("league_memberships")
    .update(updates)
    .eq("id", membershipId);

  if (error) return { error: error.message };

  revalidatePath("/leagues");
  return { success: true };
}

/** Remove a player from a league (set left_at) */
export async function removeMember(
  membershipId: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("league_memberships")
    .update({ left_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) return { error: error.message };

  revalidatePath("/leagues");
  return { success: true };
}

/** Create a team within a league (assign team_name to members) */
export async function createTeam(
  leagueId: string,
  teamName: string
): Promise<AdminActionState> {
  // Teams are implicit via team_name on memberships
  // This action is mainly for validation
  if (!teamName || teamName.trim().length === 0) {
    return { error: "Team name is required" };
  }
  return { success: true };
}

/** Batch assign players to a team */
export async function assignPlayersToTeam(
  leagueId: string,
  membershipIds: string[],
  teamName: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  for (const mid of membershipIds) {
    const { error } = await supabase
      .from("league_memberships")
      .update({ team_name: teamName })
      .eq("id", mid)
      .eq("league_id", leagueId);

    if (error) return { error: error.message };
  }

  revalidatePath(`/leagues/${leagueId}`);
  return { success: true };
}
