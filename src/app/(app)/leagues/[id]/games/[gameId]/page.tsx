import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatRate } from "@/lib/stats";
import { StatEntryForm } from "@/components/stat-entry-form";
import { FinalizeGameForm } from "@/components/finalize-game-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("home_team, away_team, game_date")
    .eq("id", gameId)
    .single();
  return {
    title: game
      ? `${game.away_team} @ ${game.home_team}`
      : "Game",
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id: leagueId, gameId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("name, owner_id")
    .eq("id", leagueId)
    .single();

  const isOwner = league?.owner_id === user.id;

  // Get roster for stat entry dropdown
  const { data: roster } = await supabase
    .from("league_memberships")
    .select(
      `
      id,
      team_name,
      players:player_id (id, handle, display_name)
    `
    )
    .eq("league_id", leagueId)
    .is("left_at", null);

  // Get existing stats for this game
  const { data: gameStats } = await supabase
    .from("softball_game_player_stats")
    .select(
      `
      *,
      league_memberships:membership_id (
        team_name,
        players:player_id (handle, display_name)
      )
    `
    )
    .eq("game_id", gameId);

  return (
    <main className="container py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <Link href={`/leagues/${leagueId}`} className="hover:underline">
          {league?.name}
        </Link>
        {" / "}
        <span>Game</span>
      </div>

      {/* Game header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {game.away_team} @ {game.home_team}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(game.game_date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="text-right">
          {game.status === "final" ? (
            <div>
              <p className="text-3xl font-mono font-bold">
                {game.away_score} - {game.home_score}
              </p>
              <p className="text-xs text-muted-foreground uppercase">Final</p>
            </div>
          ) : (
            <span className="capitalize rounded-full bg-secondary px-3 py-1 text-sm">
              {game.status}
            </span>
          )}
        </div>
      </div>

      {game.notes && (
        <p className="text-sm text-muted-foreground">{game.notes}</p>
      )}

      {/* Finalize game (if owner and game isn't final) */}
      {isOwner && game.status !== "final" && (
        <FinalizeGameForm gameId={gameId} />
      )}

      {/* Box score */}
      {gameStats && gameStats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Box Score</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium">Player</th>
                  <th className="pb-2 px-1 font-medium text-center">AB</th>
                  <th className="pb-2 px-1 font-medium text-center">R</th>
                  <th className="pb-2 px-1 font-medium text-center">H</th>
                  <th className="pb-2 px-1 font-medium text-center">2B</th>
                  <th className="pb-2 px-1 font-medium text-center">3B</th>
                  <th className="pb-2 px-1 font-medium text-center">HR</th>
                  <th className="pb-2 px-1 font-medium text-center">RBI</th>
                  <th className="pb-2 px-1 font-medium text-center">BB</th>
                  <th className="pb-2 px-1 font-medium text-center">SO</th>
                  <th className="pb-2 px-1 font-medium text-center">AVG</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((s) => {
                  const membership = s.league_memberships as unknown as {
                    team_name: string | null;
                    players: { handle: string; display_name: string };
                  };
                  const avg = s.ab > 0 ? s.h / s.ab : 0;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4">
                        <Link
                          href={`/players/${membership?.players?.handle}`}
                          className="font-medium hover:underline"
                        >
                          {membership?.players?.display_name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-2 px-1 text-center">{s.ab}</td>
                      <td className="py-2 px-1 text-center">{s.r}</td>
                      <td className="py-2 px-1 text-center">{s.h}</td>
                      <td className="py-2 px-1 text-center">{s.doubles}</td>
                      <td className="py-2 px-1 text-center">{s.triples}</td>
                      <td className="py-2 px-1 text-center">{s.hr}</td>
                      <td className="py-2 px-1 text-center">{s.rbi}</td>
                      <td className="py-2 px-1 text-center">{s.bb}</td>
                      <td className="py-2 px-1 text-center">{s.so}</td>
                      <td className="py-2 px-1 text-center font-mono">
                        {formatRate(avg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Stat entry (for owner/scorers) */}
      {isOwner && roster && roster.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Enter Player Stats</h2>
          <p className="text-sm text-muted-foreground">
            Select a player and enter their box score for this game.
          </p>
          <StatEntryForm
            gameId={gameId}
            roster={roster.map((m) => {
              const p = m.players as unknown as {
                id: string;
                handle: string;
                display_name: string;
              };
              return {
                membershipId: m.id,
                displayName: p?.display_name ?? "Unknown",
                handle: p?.handle ?? "",
                teamName: m.team_name,
              };
            })}
          />
        </section>
      )}
    </main>
  );
}
