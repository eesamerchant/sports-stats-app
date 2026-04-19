"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  sport: z.enum(["softball", "baseball", "basketball"]),
  season: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export type LeagueActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createLeague(
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = CreateLeagueSchema.safeParse({
    name: formData.get("name"),
    sport: formData.get("sport"),
    season: formData.get("season") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Generate join code via DB function
  const { data: joinCode, error: codeError } = await supabase.rpc(
    "generate_join_code"
  );

  if (codeError || !joinCode) {
    return { error: "Failed to generate join code. Try again." };
  }

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      sport: parsed.data.sport,
      season: parsed.data.season ?? null,
      description: parsed.data.description ?? null,
      join_code: joinCode,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Also create a player profile for the manager if they don't have one,
  // and add them as a manager member of the league
  const { data: existingPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingPlayer && league) {
    await supabase.from("league_memberships").insert({
      player_id: existingPlayer.id,
      league_id: league.id,
      role: "manager",
      can_score: true,
    });
  }

  redirect(`/leagues/${league!.id}`);
}

export async function joinLeagueByCode(
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return { error: "Enter a valid 6-character join code." };
  }

  // First check the league's join mode
  const { data: league } = await supabase
    .from("leagues")
    .select("id, join_mode, owner_id")
    .eq("join_code", code)
    .single();

  if (!league) {
    return { error: "Invalid join code. No league found." };
  }

  // Get the player profile
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!player) {
    return { error: "Please complete your player profile first." };
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("league_memberships")
    .select("id")
    .eq("league_id", league.id)
    .eq("player_id", player.id)
    .is("left_at", null)
    .single();

  if (existingMembership) {
    redirect(`/leagues/${league.id}`);
  }

  const joinMode = league.join_mode ?? "open";

  if (joinMode === "open") {
    // Direct join via RPC
    const { error } = await supabase.rpc("join_league_by_code", {
      p_code: code,
    });

    if (error) {
      return { error: error.message };
    }

    redirect(`/leagues/${league.id}`);
  } else if (joinMode === "invite_only") {
    return { error: "This league is invite-only. Ask the league admin for a direct invite." };
  } else {
    // admin_approval or manager_approval — create a join request
    const { data: existingRequest } = await supabase
      .from("league_join_requests")
      .select("id, status")
      .eq("league_id", league.id)
      .eq("player_id", player.id)
      .single();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return { error: "Your join request is already pending. Please wait for approval." };
      } else if (existingRequest.status === "rejected") {
        // Allow re-requesting after rejection
        await supabase
          .from("league_join_requests")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", existingRequest.id);
        return { error: "Your join request has been resubmitted for approval." };
      }
    } else {
      await supabase
        .from("league_join_requests")
        .insert({
          league_id: league.id,
          player_id: player.id,
        });
    }

    return { error: "Join request submitted! The league admin will review your request." };
  }
}

export async function updateLeague(
  leagueId: string,
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = CreateLeagueSchema.safeParse({
    name: formData.get("name"),
    sport: formData.get("sport"),
    season: formData.get("season") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("leagues")
    .update({
      name: parsed.data.name,
      sport: parsed.data.sport,
      season: parsed.data.season ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("id", leagueId);

  if (error) return { error: error.message };

  redirect(`/leagues/${leagueId}`);
}
