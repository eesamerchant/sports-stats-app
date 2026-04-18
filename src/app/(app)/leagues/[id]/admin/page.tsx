import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isMasterAdmin, isLeagueAdmin } from "@/lib/auth-helpers";
import { GameCsvUploader } from "@/components/game-csv-uploader";
import { ManagerPermissions } from "@/components/manager-permissions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league?.name ? `${league.name} - Admin` : "League Admin" };
}

export default async function LeagueAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch league
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (!league) notFound();

  // Check authorization: only owner or master admin
  const isMaster = await isMasterAdmin(supabase, user.id);
  const isOwner = league.owner_id === user.id;

  if (!isMaster && !isOwner) {
    redirect(`/leagues/${id}`);
  }

  // Fetch roster with player details
  const { data: roster } = await supabase
    .from("league_memberships")
    .select(
      `
      id,
      player_id,
      role,
      team_name,
      jersey_number,
      can_score,
      joined_at,
      left_at,
      players:player_id (
        id,
        handle,
        display_name
      )
    `
    )
    .eq("league_id", id)
    .is("left_at", null)
    .order("team_name", { ascending: true });

  // Fetch manager permissions
  const { data: managerPerms } = await supabase
    .from("league_manager_permissions")
    .select("*")
    .eq("league_id", id)
    .single();

  const permissions = {
    can_add_players: managerPerms?.can_add_players ?? true,
    can_remove_players: managerPerms?.can_remove_players ?? false,
    can_update_stats: managerPerms?.can_update_stats ?? true,
    can_edit_scores: managerPerms?.can_edit_scores ?? true,
    can_manage_roster: managerPerms?.can_manage_roster ?? true,
    can_create_games: managerPerms?.can_create_games ?? false,
    can_edit_games: managerPerms?.can_edit_games ?? false,
  };

  // Fetch games
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", id)
    .order("game_date", { ascending: false });

  // Calculate stats
  const totalPlayers = roster?.length ?? 0;
  const uniqueTeams = new Set(roster?.map((m) => m.team_name).filter(Boolean));
  const totalTeams = uniqueTeams.size;
  const totalGames = games?.length ?? 0;
  const completedGames = games?.filter((g) => g.status === "final").length ?? 0;

  // Get unique teams
  const teams = Array.from(uniqueTeams).map((teamName) => {
    const teamMembers = roster?.filter((m) => m.team_name === teamName) ?? [];
    return {
      name: teamName,
      memberCount: teamMembers.length,
    };
  });

  // Get last 5 games
  const recentGames = (games ?? []).slice(0, 5);

  // Prepare data for CSV uploader
  const gamesCsvData = (games ?? []).map((g) => ({
    id: g.id,
    game_date: g.game_date,
    home_team: g.home_team,
    away_team: g.away_team,
    status: g.status,
  }));

  const rosterCsvData = (roster ?? []).map((m) => ({
    id: m.id,
    player_name: (m.players as any)?.display_name ?? "Unknown",
    player_handle: (m.players as any)?.handle ?? "unknown",
  }));

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{league.name} - Admin</h1>
          <p className="text-sm text-muted-foreground">
            {league.sport} {league.season ? `· ${league.season}` : ""} · League
            owner dashboard
          </p>
        </div>
        <Link
          href={`/leagues/${id}`}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:opacity-90 transition text-center"
        >
          Back to league
        </Link>
      </div>

      {/* League Overview */}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                League Name
              </p>
              <p className="text-lg font-medium">{league.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Sport
                </p>
                <p className="text-sm font-medium">{league.sport}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Season
                </p>
                <p className="text-sm font-medium">{league.season || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Status
                </p>
                <p className="text-sm font-medium capitalize">{league.status}</p>
              </div>
            </div>

            {league.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">
                  Description
                </p>
                <p className="text-sm text-foreground">{league.description}</p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                Join Code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-secondary px-3 py-2 font-mono text-sm font-semibold select-all">
                  {league.join_code}
                </code>
              </div>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="pt-4 border-t border-border">
            <Link
              href={`/leagues/${id}/admin/edit`}
              className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition"
            >
              Edit League
            </Link>
          </div>
        )}
      </section>

      {/* Quick Stats Cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
            Total Players
          </p>
          <p className="text-2xl font-bold">{totalPlayers}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
            Teams
          </p>
          <p className="text-2xl font-bold">{totalTeams}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
            Total Games
          </p>
          <p className="text-2xl font-bold">{totalGames}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
            Completed
          </p>
          <p className="text-2xl font-bold">
            {completedGames}/{totalGames}
          </p>
        </div>
      </section>

      {/* Teams Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teams</h2>
          <button
            disabled
            className="text-sm text-muted-foreground opacity-50 cursor-not-allowed"
          >
            + Add Team (coming soon)
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team.name}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.memberCount} player{team.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/leagues/${id}/manage`}
                  className="inline-block text-sm text-primary hover:underline"
                >
                  Manage roster →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Games</h2>
          <Link
            href={`/leagues/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            View all →
          </Link>
        </div>

        {recentGames.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No games scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                href={`/leagues/${id}/games/${game.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition"
              >
                <div>
                  <p className="font-medium">
                    {game.away_team ?? "Away"} @ {game.home_team ?? "Home"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(game.game_date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {game.status === "final" ? (
                    <p className="font-mono font-semibold">
                      {game.away_score} - {game.home_score}
                    </p>
                  ) : (
                    <span className="text-xs capitalize rounded-full bg-secondary px-2 py-0.5">
                      {game.status}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CSV Upload Section */}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Bulk Import Game Stats</h2>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to import batting stats for a game. This is useful
            for quickly entering stats after a game.
          </p>
        </div>

        {gamesCsvData.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Create games first before uploading stats.
            </p>
          </div>
        ) : (
          <GameCsvUploader games={gamesCsvData} roster={rosterCsvData} />
        )}
      </section>

      {/* Team Manager Permissions */}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Team Manager Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Control what team managers in this league can do. These settings apply to all team managers.
          </p>
        </div>
        <ManagerPermissions leagueId={id} initialPermissions={permissions} />
      </section>

      {/* Admin Actions */}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/leagues/${id}/manage`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">Manage Roster</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>

          <Link
            href={`/leagues/${id}/schedule`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">Schedule Games</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>

          <Link
            href={`/leagues/${id}/bracket`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">Playoff Bracket</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>

          <Link
            href={`/leagues/${id}/calendar`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">Calendar View</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
