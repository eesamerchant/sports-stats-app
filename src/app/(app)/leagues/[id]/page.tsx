import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatRate } from "@/lib/stats";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league?.name ?? "League" };
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (!league) notFound();

  // Check if user is the owner (league admin)
  const isOwner = league.owner_id === user.id;

  // Check if user is a team manager in this league
  const { data: playerProfile } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let isTeamManager = false;
  if (playerProfile) {
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", id)
      .eq("player_id", playerProfile.id)
      .is("left_at", null)
      .single();
    isTeamManager = membership?.role === "manager" || membership?.role === "captain";
  }

  const canManageStats = isOwner || isTeamManager;

  // Get roster
  const { data: roster } = await supabase
    .from("league_memberships")
    .select(
      `
      id,
      role,
      team_name,
      jersey_number,
      can_score,
      players:player_id (id, handle, display_name, bats, throws)
    `
    )
    .eq("league_id", id)
    .is("left_at", null)
    .order("role");

  // Get games
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", id)
    .order("game_date", { ascending: false });

  // Get league stats for leaderboard
  const { data: leagueStats } = await supabase
    .from("player_league_stats")
    .select("*")
    .eq("league_id", id)
    .order("avg", { ascending: false });

  return (
    <main className="container py-8 space-y-8">
      {/* League header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {league.logo_url && (
            <img
              src={league.logo_url}
              alt={league.name}
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <p className="text-sm text-muted-foreground">
              {league.sport} {league.season ? `· ${league.season}` : ""} ·{" "}
              <span className="capitalize">{league.status}</span>
            </p>
            {league.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {league.description}
              </p>
            )}
            {/* Social links */}
            <div className="flex flex-wrap gap-3 mt-2">
              {league.website && (
                <a href={league.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  Website
                </a>
              )}
              {league.social_facebook && (
                <a href={`https://facebook.com/${league.social_facebook}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  Facebook
                </a>
              )}
              {league.social_instagram && (
                <a href={`https://instagram.com/${league.social_instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  Instagram
                </a>
              )}
              {league.social_twitter && (
                <a href={`https://x.com/${league.social_twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  X/Twitter
                </a>
              )}
              {league.social_tiktok && (
                <a href={`https://tiktok.com/${league.social_tiktok.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Join code:</span>
            <code className="rounded bg-secondary px-2 py-1 font-mono text-sm font-semibold">
              {league.join_code}
            </code>
          </div>
          {(isOwner || canManageStats) && (
            <div className="flex flex-wrap gap-2">
              {isOwner && (
                <>
                  <Link
                    href={`/leagues/${id}/admin`}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition text-center"
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    href={`/leagues/${id}/schedule`}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
                  >
                    Schedule
                  </Link>
                  <Link
                    href={`/leagues/${id}/bracket`}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
                  >
                    Bracket
                  </Link>
                </>
              )}
              <Link
                href={`/leagues/${id}/standings`}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
              >
                Standings
              </Link>
              <Link
                href={`/leagues/${id}/calendar`}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
              >
                Calendar
              </Link>
              {canManageStats && (
                <Link
                  href={`/leagues/${id}/games/new`}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition text-center"
                >
                  + Add Game
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {leagueStats && leagueStats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Stats Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium">Player</th>
                  <th className="pb-2 px-2 font-medium text-center">GP</th>
                  <th className="pb-2 px-2 font-medium text-center">AB</th>
                  <th className="pb-2 px-2 font-medium text-center">H</th>
                  <th className="pb-2 px-2 font-medium text-center">HR</th>
                  <th className="pb-2 px-2 font-medium text-center">RBI</th>
                  <th className="pb-2 px-2 font-medium text-center">AVG</th>
                  <th className="pb-2 px-2 font-medium text-center">OBP</th>
                  <th className="pb-2 px-2 font-medium text-center">SLG</th>
                  <th className="pb-2 px-2 font-medium text-center">XBH</th>
                </tr>
              </thead>
              <tbody>
                {leagueStats.map((s) => (
                  <tr key={s.player_id} className="border-b border-border/50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/players/${s.player_handle}`}
                        className="font-medium hover:underline"
                      >
                        {s.player_name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-center">{s.gp}</td>
                    <td className="py-2 px-2 text-center">{s.ab}</td>
                    <td className="py-2 px-2 text-center">{s.h}</td>
                    <td className="py-2 px-2 text-center">{s.hr}</td>
                    <td className="py-2 px-2 text-center">{s.rbi}</td>
                    <td className="py-2 px-2 text-center font-mono">
                      {formatRate(Number(s.avg))}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {formatRate(Number(s.obp))}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {formatRate(Number(s.slg))}
                    </td>
                    <td className="py-2 px-2 text-center">{s.xbh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Games */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Games</h2>
          {canManageStats && (
            <Link
              href={`/leagues/${id}/games/new`}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              + Add game
            </Link>
          )}
        </div>

        {!games || games.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-muted-foreground">No games scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/leagues/${id}/games/${game.id}`}
                className="flex items-center justify-between rounded-md border border-border p-4 hover:bg-accent/50 transition"
              >
                <div>
                  <p className="font-medium">
                    {game.away_team ?? "Away"} @ {game.home_team ?? "Home"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(game.game_date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
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

      {/* Roster */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Roster ({roster?.length ?? 0})
        </h2>

        {!roster || roster.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-muted-foreground">
              No players yet. Share the join code{" "}
              <code className="font-mono font-semibold">{league.join_code}</code>{" "}
              to invite players.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((m) => {
              const p = m.players as unknown as {
                id: string;
                handle: string;
                display_name: string;
                bats: string | null;
                throws: string | null;
              };
              if (!p) return null;
              return (
                <Link
                  key={m.id}
                  href={`/players/${p.handle}`}
                  className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-accent/50 transition"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
                    {p.display_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{p.handle}
                      {m.jersey_number ? ` · #${m.jersey_number}` : ""}
                      {m.team_name ? ` · ${m.team_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs capitalize text-muted-foreground">
                    {m.role}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
