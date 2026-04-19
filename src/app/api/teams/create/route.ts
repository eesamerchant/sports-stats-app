import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { leagueId, teamName } = body;

  if (!leagueId || !teamName) {
    return NextResponse.json(
      { error: "League ID and team name are required." },
      { status: 400 }
    );
  }

  // Verify the user is the league owner
  const { data: league } = await supabase
    .from("leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .single();

  if (!league || league.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the league owner can add teams." },
      { status: 403 }
    );
  }

  // Insert into league_teams table
  const { error } = await supabase
    .from("league_teams")
    .insert({ league_id: leagueId, name: teamName.trim() });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A team with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, teamName });
}
