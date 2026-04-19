"use server";

import { createClient } from "@/lib/supabase/server";

export interface LeagueSearchResult {
  id: string;
  name: string;
  sport: string;
  season: string | null;
  join_code: string;
  logo_url: string | null;
}

export interface PlayerSearchResult {
  id: string;
  handle: string;
  display_name: string;
  photo_url: string | null;
}

export async function searchLeagues(
  query: string
): Promise<LeagueSearchResult[]> {
  if (!query.trim()) return [];

  const supabase = await createClient();
  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, sport, season, join_code, logo_url")
    .eq("status", "active")
    .or(`name.ilike.${searchTerm},join_code.ilike.${searchTerm}`)
    .limit(8);

  if (error) {
    console.error("League search error:", error);
    return [];
  }

  return data || [];
}

export async function searchPlayers(
  query: string
): Promise<PlayerSearchResult[]> {
  if (!query.trim()) return [];

  const supabase = await createClient();
  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from("players")
    .select("id, handle, display_name, photo_url")
    .or(`display_name.ilike.${searchTerm},handle.ilike.${searchTerm}`)
    .limit(8);

  if (error) {
    console.error("Player search error:", error);
    return [];
  }

  return data || [];
}
