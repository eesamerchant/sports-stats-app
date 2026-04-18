import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Get current user or redirect to login */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Check if current user is app-level master admin */
export async function isMasterAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_profiles")
    .select("is_app_admin")
    .eq("id", userId)
    .single();
  return data?.is_app_admin === true;
}

/** Check if current user is the league owner (league admin) */
export async function isLeagueAdmin(supabase: any, leagueId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .single();
  return data?.owner_id === userId;
}

/** Check if current user is a team manager in a league */
export async function isTeamManager(supabase: any, leagueId: string, playerId: string): Promise<boolean> {
  const { data } = await supabase
    .from("league_memberships")
    .select("role")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .is("left_at", null)
    .single();
  return data?.role === "manager" || data?.role === "captain";
}

/** Get the player profile for a user */
export async function getPlayerForUser(supabase: any, userId: string) {
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

/**
 * Check if user has elevated access to a league.
 * Returns the highest role: "master" | "league_admin" | "team_manager" | "player" | null
 */
export async function getLeagueRole(
  supabase: any,
  leagueId: string,
  userId: string
): Promise<"master" | "league_admin" | "team_manager" | "player" | null> {
  const admin = await isMasterAdmin(supabase, userId);
  if (admin) return "master";

  const leagueAdmin = await isLeagueAdmin(supabase, leagueId, userId);
  if (leagueAdmin) return "league_admin";

  const player = await getPlayerForUser(supabase, userId);
  if (!player) return null;

  const { data: membership } = await supabase
    .from("league_memberships")
    .select("role")
    .eq("league_id", leagueId)
    .eq("player_id", player.id)
    .is("left_at", null)
    .single();

  if (!membership) return null;
  if (membership.role === "manager" || membership.role === "captain") return "team_manager";
  return "player";
}
