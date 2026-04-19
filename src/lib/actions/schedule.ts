"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ScheduleActionState = {
  error?: string;
  success?: boolean;
};

/** Bulk create games from a generated schedule */
export async function bulkCreateGames(
  leagueId: string,
  games: Array<{
    game_date: string;
    start_time?: string;
    home_team: string;
    away_team: string;
    notes?: string;
    field_name?: string;
    location?: string;
    duration_minutes?: number;
  }>
): Promise<ScheduleActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = games.map((g) => {
    // Combine game_date + start_time into a proper timestamptz if start_time is a plain time string like "18:00"
    let startTimeValue: string | null = g.start_time ?? null;
    if (startTimeValue && !startTimeValue.includes("T") && !startTimeValue.includes("-")) {
      // It's a plain time like "18:00" — combine with game_date to form a full timestamp
      startTimeValue = `${g.game_date}T${startTimeValue}:00`;
    }

    return {
      league_id: leagueId,
      game_date: g.game_date,
      start_time: startTimeValue,
      home_team: g.home_team,
      away_team: g.away_team,
      notes: g.notes ?? null,
      field_name: g.field_name ?? null,
      location: g.location ?? null,
      duration_minutes: g.duration_minutes ?? null,
      created_by: user.id,
    };
  });

  const { error } = await supabase.from("games").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/leagues/${leagueId}`);
  return { success: true };
}

/** Update a single game's schedule details */
export async function updateGameSchedule(
  gameId: string,
  data: {
    game_date?: string;
    start_time?: string;
    home_team?: string;
    away_team?: string;
    notes?: string;
    status?: string;
  }
): Promise<ScheduleActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updates: Record<string, any> = {};
  if (data.game_date) updates.game_date = data.game_date;
  if (data.start_time !== undefined) updates.start_time = data.start_time || null;
  if (data.home_team) updates.home_team = data.home_team;
  if (data.away_team) updates.away_team = data.away_team;
  if (data.notes !== undefined) updates.notes = data.notes || null;
  if (data.status) updates.status = data.status;

  const { error } = await supabase
    .from("games")
    .update(updates)
    .eq("id", gameId);
  if (error) return { error: error.message };

  return { success: true };
}

/** Delete a game (only if scheduled, not final) */
export async function deleteGame(gameId: string): Promise<ScheduleActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("games")
    .update({ status: "voided" })
    .eq("id", gameId)
    .in("status", ["scheduled"]);

  if (error) return { error: error.message };
  return { success: true };
}
