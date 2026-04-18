"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type GameActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const CreateGameSchema = z.object({
  league_id: z.string().uuid(),
  game_date: z.string().min(1),
  home_team: z.string().min(1).max(100),
  away_team: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

export async function createGame(
  _prev: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = CreateGameSchema.safeParse({
    league_id: formData.get("league_id"),
    game_date: formData.get("game_date"),
    home_team: formData.get("home_team"),
    away_team: formData.get("away_team"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase.from("games").insert({
    league_id: parsed.data.league_id,
    game_date: parsed.data.game_date,
    home_team: parsed.data.home_team,
    away_team: parsed.data.away_team,
    notes: parsed.data.notes ?? null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  redirect(`/leagues/${parsed.data.league_id}`);
}

export async function finalizeGame(gameId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const homeScore = parseInt(formData.get("home_score") as string) || 0;
  const awayScore = parseInt(formData.get("away_score") as string) || 0;

  const { error } = await supabase
    .from("games")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: "final",
    })
    .eq("id", gameId);

  if (error) return { error: error.message };

  // Get the league_id for revalidation
  const { data: game } = await supabase
    .from("games")
    .select("league_id")
    .eq("id", gameId)
    .single();

  if (game) {
    revalidatePath(`/leagues/${game.league_id}`);
  }

  return { error: undefined };
}

const StatEntrySchema = z.object({
  membership_id: z.string().uuid(),
  pa: z.coerce.number().int().min(0),
  ab: z.coerce.number().int().min(0),
  r: z.coerce.number().int().min(0),
  h: z.coerce.number().int().min(0),
  doubles: z.coerce.number().int().min(0),
  triples: z.coerce.number().int().min(0),
  hr: z.coerce.number().int().min(0),
  rbi: z.coerce.number().int().min(0),
  bb: z.coerce.number().int().min(0),
  so: z.coerce.number().int().min(0),
  sf: z.coerce.number().int().min(0),
  hbp: z.coerce.number().int().min(0),
  ab_risp: z.coerce.number().int().min(0),
  h_risp: z.coerce.number().int().min(0),
});

export async function submitPlayerGameStats(
  gameId: string,
  _prev: GameActionState,
  formData: FormData
): Promise<GameActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = StatEntrySchema.safeParse({
    membership_id: formData.get("membership_id"),
    pa: formData.get("pa"),
    ab: formData.get("ab"),
    r: formData.get("r"),
    h: formData.get("h"),
    doubles: formData.get("doubles"),
    triples: formData.get("triples"),
    hr: formData.get("hr"),
    rbi: formData.get("rbi"),
    bb: formData.get("bb"),
    so: formData.get("so"),
    sf: formData.get("sf"),
    hbp: formData.get("hbp"),
    ab_risp: formData.get("ab_risp"),
    h_risp: formData.get("h_risp"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("softball_game_player_stats")
    .upsert(
      {
        game_id: gameId,
        membership_id: parsed.data.membership_id,
        gp: 1,
        pa: parsed.data.pa,
        ab: parsed.data.ab,
        r: parsed.data.r,
        h: parsed.data.h,
        doubles: parsed.data.doubles,
        triples: parsed.data.triples,
        hr: parsed.data.hr,
        rbi: parsed.data.rbi,
        bb: parsed.data.bb,
        so: parsed.data.so,
        sf: parsed.data.sf,
        hbp: parsed.data.hbp,
        ab_risp: parsed.data.ab_risp,
        h_risp: parsed.data.h_risp,
      },
      { onConflict: "game_id,membership_id" }
    );

  if (error) return { error: error.message };

  revalidatePath(`/leagues`);
  return {};
}
