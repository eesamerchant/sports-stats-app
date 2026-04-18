import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isMasterAdmin } from "@/lib/auth-helpers";
import BracketBuilder from "@/components/bracket-builder";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league?.name ? `${league.name} - Bracket` : "Playoff Bracket" };
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch league
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  // Check authorization: only owner or master admin
  const isMaster = await isMasterAdmin(supabase, user.id);
  const isOwner = league.owner_id === user.id;

  if (!isMaster && !isOwner) {
    redirect(`/leagues/${leagueId}`);
  }

  // Fetch distinct team names from league_memberships
  const { data: memberships } = await supabase
    .from("league_memberships")
    .select("team_name")
    .eq("league_id", leagueId)
    .not("team_name", "is", null);

  const teams = Array.from(
    new Set((memberships || []).map((m) => m.team_name).filter(Boolean))
  ).sort() as string[];

  // Fetch existing bracket games (games with "bracket" or "playoff" in notes)
  const { data: allGames } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", leagueId)
    .order("game_date", { ascending: true });

  const bracketGames = (allGames || []).filter(
    (g) =>
      g.notes?.toLowerCase().includes("bracket") ||
      g.notes?.toLowerCase().includes("playoff")
  );

  return (
    <main className="min-h-screen bg-background text-primary-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href={`/leagues/${leagueId}`}
              className="text-muted-foreground hover:text-primary-foreground transition"
            >
              ← Back to League
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
          <p className="text-muted-foreground">
            Playoff Bracket Builder
            {bracketGames.length > 0 && ` • ${bracketGames.length} games scheduled`}
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-md border border-border bg-card/50 p-4 mb-8">
          <p className="text-sm text-muted-foreground">
            {teams.length === 0 ? (
              <>No teams found. Add team names to league memberships first.</>
            ) : (
              <>
                {teams.length} teams available.{" "}
                {bracketGames.length > 0
                  ? "Your bracket is set up. Edit seeding below to create a new bracket."
                  : "Create a tournament bracket below."}
              </>
            )}
          </p>
        </div>

        {/* Bracket Builder Component */}
        {teams.length > 0 ? (
          <BracketBuilder
            leagueId={leagueId}
            teams={teams}
            existingGames={bracketGames}
          />
        ) : (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No teams available in this league. Please add team names to player memberships first.
            </p>
            <Link
              href={`/leagues/${leagueId}/manage`}
              className="text-primary hover:underline transition"
            >
              Manage League Memberships
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
