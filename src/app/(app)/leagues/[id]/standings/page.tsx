import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league ? `Standings | ${league.name}` : "Standings" };
}

interface TeamStanding {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
  streak: string;
  streakColor: "text-green-400" | "text-red-400";
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (!league) notFound();

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", id)
    .eq("status", "final")
    .order("game_date", { ascending: false });

  // Calculate standings
  const standingsMap = new Map<string, TeamStanding>();

  if (games && games.length > 0) {
    // Initialize team entries
    const teams = new Set<string>();
    games.forEach((game) => {
      if (game.home_team) teams.add(game.home_team);
      if (game.away_team) teams.add(game.away_team);
    });

    teams.forEach((team) => {
      standingsMap.set(team, {
        team,
        wins: 0,
        losses: 0,
        ties: 0,
        winPct: 0,
        runsScored: 0,
        runsAllowed: 0,
        runDiff: 0,
        streak: "",
        streakColor: "text-green-400",
      });
    });

    // Process games
    games.forEach((game) => {
      const home = game.home_team;
      const away = game.away_team;
      const homeScore = game.home_score ?? 0;
      const awayScore = game.away_score ?? 0;

      if (!home || !away) return;

      const homeStanding = standingsMap.get(home)!;
      const awayStanding = standingsMap.get(away)!;

      homeStanding.runsScored += homeScore;
      homeStanding.runsAllowed += awayScore;
      awayStanding.runsScored += awayScore;
      awayStanding.runsAllowed += homeScore;

      if (homeScore > awayScore) {
        homeStanding.wins += 1;
        awayStanding.losses += 1;
      } else if (awayScore > homeScore) {
        awayStanding.wins += 1;
        homeStanding.losses += 1;
      } else {
        homeStanding.ties += 1;
        awayStanding.ties += 1;
      }
    });

    // Calculate win percentage and run differential
    standingsMap.forEach((standing) => {
      const totalGames = standing.wins + standing.losses + standing.ties;
      if (totalGames > 0) {
        standing.winPct = (standing.wins + standing.ties * 0.5) / totalGames;
      }
      standing.runDiff = standing.runsScored - standing.runsAllowed;
    });

    // Calculate streaks
    standingsMap.forEach((standing) => {
      let streak = 0;
      let streakType = "W";

      // Go through games in reverse chronological order (most recent first)
      for (const game of games) {
        let isRelevant = false;
        let won = false;

        if (game.home_team === standing.team) {
          isRelevant = true;
          won = (game.home_score ?? 0) > (game.away_score ?? 0);
        } else if (game.away_team === standing.team) {
          isRelevant = true;
          won = (game.away_score ?? 0) > (game.home_score ?? 0);
        }

        if (!isRelevant) continue;

        if (streak === 0) {
          // Start of streak
          streak = 1;
          streakType = won ? "W" : "L";
        } else if ((won && streakType === "W") || (!won && streakType === "L")) {
          // Continue streak
          streak += 1;
        } else {
          // Streak broken
          break;
        }
      }

      standing.streak = streak > 0 ? `${streakType}${streak}` : "";
      standing.streakColor = streakType === "W" ? "text-green-400" : "text-red-400";
    });
  }

  // Sort standings
  const standings = Array.from(standingsMap.values()).sort((a, b) => {
    // Sort by win percentage (desc), then wins (desc), then run differential (desc)
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.runDiff - a.runDiff;
  });

  return (
    <main className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/leagues/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition mb-2 inline-block"
          >
            ← Back to {league.name}
          </Link>
          <h1 className="text-2xl font-bold">Standings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {league.sport} {league.season ? `· ${league.season}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/leagues/${id}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
          >
            League Overview
          </Link>
          <Link
            href={`/leagues/${id}/standings`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Standings
          </Link>
        </div>
      </div>

      {/* Standings Table */}
      {standings.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            No completed games yet. Standings will appear once games are finalized.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="py-3 px-4 text-left font-semibold text-primary-foreground">#</th>
                <th className="py-3 px-4 text-left font-semibold text-primary-foreground">Team</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">W</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">L</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">T</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">PCT</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">RS</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">RA</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">DIFF</th>
                <th className="py-3 px-4 text-center font-semibold text-primary-foreground">STRK</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr
                  key={standing.team}
                  className="border-b border-border/50 hover:bg-card/50 transition"
                >
                  <td className="py-3 px-4 font-medium text-muted-foreground w-8">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-primary">{standing.team}</td>
                  <td className="py-3 px-4 text-center text-primary">{standing.wins}</td>
                  <td className="py-3 px-4 text-center text-primary">{standing.losses}</td>
                  <td className="py-3 px-4 text-center text-primary">{standing.ties}</td>
                  <td className="py-3 px-4 text-center font-mono text-primary">
                    {standing.winPct > 0 ? standing.winPct.toFixed(3) : ".000"}
                  </td>
                  <td className="py-3 px-4 text-center text-primary">{standing.runsScored}</td>
                  <td className="py-3 px-4 text-center text-primary">{standing.runsAllowed}</td>
                  <td
                    className={`py-3 px-4 text-center font-semibold font-mono ${
                      standing.runDiff > 0
                        ? "text-green-400"
                        : standing.runDiff < 0
                          ? "text-red-400"
                          : "text-primary"
                    }`}
                  >
                    {standing.runDiff > 0 ? "+" : ""}
                    {standing.runDiff}
                  </td>
                  <td
                    className={`py-3 px-4 text-center font-semibold ${standing.streakColor}`}
                  >
                    {standing.streak || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {standings.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border/50">
          <p>
            <span className="font-semibold">W</span> = Wins · <span className="font-semibold">L</span> = Losses · <span className="font-semibold">T</span> = Ties
          </p>
          <p>
            <span className="font-semibold">PCT</span> = Win Percentage · <span className="font-semibold">RS</span> = Runs Scored · <span className="font-semibold">RA</span> = Runs Allowed
          </p>
          <p>
            <span className="font-semibold">DIFF</span> = Run Differential · <span className="font-semibold">STRK</span> = Current Streak (W = wins, L = losses)
          </p>
        </div>
      )}
    </main>
  );
}
