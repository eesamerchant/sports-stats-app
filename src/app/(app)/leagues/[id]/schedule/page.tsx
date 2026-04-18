import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ScheduleBuilder from "@/components/schedule-builder";

interface SchedulePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id: leagueId } = await params;

  // Fetch league
  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  if (leagueError || !league) {
    redirect("/leagues");
  }

  // Fetch teams from league memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from("league_memberships")
    .select("team_name")
    .eq("league_id", leagueId);

  const teams = Array.from(
    new Set((memberships || []).map((m) => m.team_name).filter(Boolean))
  ).sort() as string[];

  // Fetch existing games
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", leagueId)
    .order("game_date", { ascending: true });

  return (
    <div className="min-h-screen bg-background text-primary-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
          <p className="text-muted-foreground">Season Schedule Builder</p>
        </div>

        <ScheduleBuilder
          leagueId={leagueId}
          leagueName={league.name}
          teams={teams}
          existingGames={games || []}
        />
      </div>
    </div>
  );
}
