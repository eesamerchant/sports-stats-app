import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isMasterAdmin } from "@/lib/auth-helpers";
import { GameCsvUploader } from "@/components/game-csv-uploader";
import { ManagerPermissions } from "@/components/manager-permissions";
import LeagueProfileEditor from "@/components/league-profile-editor";
import { AddTeamForm } from "@/components/add-team-form";

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

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (!league) notFound();

  const isMaster = await isMasterAdmin(supabase, user.id);
  const isOwner = league.owner_id === user.id;

  if (!isMaster && !isOwner) {
    redirect(`/leagues/${id}`);
  }

  // Fetch teams from league_teams table
  const { data: leagueTeams } = await supabase
    .from("league_teams")
    .select("*")
    .eq("league_id", id)
    .order("name");

  // Fetch roster with player details
  const { data: roster } = await supabase
    .from("league_memberships")
    .select(`
      id, player_id, role, team_name, jersey_number, can_score, joined_at, left_at,
      players:player_id ( id, handle, display_name )
    `)
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
  const teams = leagueTeams ?? [];
  const totalTeams = teams.length;
  const totalGames = games?.length ?? 0;
  const completedGames = games?.filter((g) => g.status === "final").length ?? 0;

  // Map players to their team assignments
  const teamPlayerMap: Record<string, typeof roster> = {};
  for (const team of teams) {
    teamPlayerMap[team.name] = (roster ?? []).filter(
      (m) => m.team_name === team.name
    );
  }
  const unassigned = (roster ?? []).filter(
    (m) => !m.team_name || !teams.some((t) => t.name === m.team_name)
  );

  const recentGames = (games ?? []).slice(0, 5);

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
          <h1 className="text-2xl font-bold">{league.name} — Admin</h1>
          <p className="text-sm text-muted-foreground">
            {league.sport} {league.season ? `· ${league.season}` : ""} · League owner dashboard
          </p>
        </div>
        <Link
          href={`/leagues/${id}`}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:opacity-90 transition text-center"
        >
          Back to league
        </Link>
      </div>

      {/* League Info Card */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Sport</p>
                <p className="text-sm font-medium capitalize">{league.sport}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Season</p>
                <p className="text-sm font-medium">{league.season || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                <p className="text-sm font-medium capitalize">{league.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Join Code</p>
                <code className="rounded bg-secondary px-2 py-0.5 font-mono text-sm font-semibold select-all">
                  {league.join_code}
                </code>
              </div>
            </div>
            {league.description && (
              <p className="text-sm text-muted-foreground">{league.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* Quick Stats Cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Players</p>
          <p className="text-2xl font-bold">{totalPlayers}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Teams</p>
          <p className="text-2xl font-bold">{totalTeams}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Games</p>
          <p className="text-2xl font-bold">{totalGames}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Completed</p>
          <p className="text-2xl font-bold">{completedGames}/{totalGames}</p>
        </div>
      </section>

      {/* Teams Section — Primary Focus */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teams</h2>
          <AddTeamForm
            leagueId={id}
            existingTeams={teams.map((t) => t.name)}
          />
        </div>

        {teams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No teams created yet.</p>
            <p className="text-xs text-muted-foreground">
              Add teams first, then assign players to them from the roster manager.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const members = teamPlayerMap[team.name] ?? [];
              return (
                <div
                  key={team.id}
                  className="rounded-lg border border-border bg-card p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {members.length} player{members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {team.color && (
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                  </div>

                  {members.length > 0 && (
                    <div className="space-y-1">
                      {members.slice(0, 5).map((m) => {
                        const p = m.players as any;
                        return (
                          <p key={m.id} className="text-xs text-muted-foreground">
                            {p?.display_name ?? "Unknown"}
                            {m.jersey_number ? ` #${m.jersey_number}` : ""}
                            <span className="ml-1 capitalize text-muted-foreground/60">({m.role})</span>
                          </p>
                        );
                      })}
                      {members.length > 5 && (
                        <p className="text-xs text-muted-foreground/60">
                          +{members.length - 5} more
                        </p>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/leagues/${id}/manage`}
                    className="inline-block text-sm text-primary hover:underline"
                  >
                    Manage roster →
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned players */}
        {unassigned.length > 0 && (
          <div className="rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
            <p className="text-sm font-medium text-yellow-400">
              {unassigned.length} unassigned player{unassigned.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((m) => {
                const p = m.players as any;
                return (
                  <span
                    key={m.id}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                  >
                    {p?.display_name ?? "Unknown"}
                  </span>
                );
              })}
            </div>
            <Link
              href={`/leagues/${id}/manage`}
              className="inline-block text-xs text-primary hover:underline"
            >
              Assign to teams →
            </Link>
          </div>
        )}
      </section>

      {/* Recent Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Games</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/leagues/${id}/games/new`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              + Add Game
            </Link>
            <Link
              href={`/leagues/${id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              View all →
            </Link>
          </div>
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
                    {new Date(game.game_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
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
            Upload a CSV file to import stats for a game.
          </p>
        </div>
        {gamesCsvData.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">Create games first before uploading stats.</p>
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
            Control what team managers in this league can do.
          </p>
        </div>
        <ManagerPermissions leagueId={id} initialPermissions={permissions} />
      </section>

      {/* League Profile & Settings */}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">League Profile & Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize your league&apos;s profile, social links, and join permissions.
          </p>
        </div>
        <LeagueProfileEditor
          leagueId={id}
          initialData={{
            logo_url: league.logo_url ?? null,
            website: league.website ?? null,
            social_facebook: league.social_facebook ?? null,
            social_instagram: league.social_instagram ?? null,
            social_twitter: league.social_twitter ?? null,
            social_tiktok: league.social_tiktok ?? null,
            join_mode: league.join_mode ?? "open",
          }}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
        />
      </section>

      {/* Quick Actions */}
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
          <Link
            href={`/leagues/${id}/standings`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">Standings</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
          <Link
            href={`/leagues/${id}/games/new`}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition"
          >
            <span className="text-sm font-medium">+ Add Game</span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
