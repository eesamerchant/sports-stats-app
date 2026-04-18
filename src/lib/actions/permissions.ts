"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type PermissionsActionState = { error?: string; success?: boolean };

export async function updateManagerPermissions(
  leagueId: string,
  permissions: {
    can_add_players: boolean;
    can_remove_players: boolean;
    can_update_stats: boolean;
    can_edit_scores: boolean;
    can_manage_roster: boolean;
    can_create_games: boolean;
    can_edit_games: boolean;
  }
): Promise<PermissionsActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("league_manager_permissions")
    .upsert({
      league_id: leagueId,
      ...permissions,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "league_id"
    });

  if (error) return { error: error.message };

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/admin`);

  return { success: true };
}
