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

  const { data, error } = await supabase.rpc("join_league_by_code", {
    p_code: code,
  });

  if (error) {
    return { error: error.message };
  }

  // Find the league from the code to redirect
  const { data: league } = await supabase
    .from("leagues")
    .select("id")
    .eq("join_code", code)
    .single();

  if (league) {
    redirect(`/leagues/${league.id}`);
  }

  redirect("/dashboard");
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
