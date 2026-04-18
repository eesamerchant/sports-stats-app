import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if the user has a player profile
  const { data: player } = await supabase
    .from("players")
    .select("id, handle, display_name")
    .eq("user_id", user.id)
    .single();

  // If no player profile, nudge them to create one
  if (!player) {
    redirect("/onboarding/player");
  }

  // Get leagues the player is a member of
  const { data: memberships } = await supabase
    .from("league_memberships")
    .select(
      `
      id,
      role,
      team_name,
      league_id,
      leagues:league_id (id, name, sport, season, status, join_code)
    `
    )
    .eq("player_id", player.id)
    .is("left_at", null);

  // Get leagues the user owns (as manager)
  const { data: ownedLeagues } = await supabase
    .from("leagues")
    .select("id, name, sport, season, status, join_code")
    .eq("owner_id", user.id);

  // Get career stats
  const { data: careerStats } = await supabase
    .from("player_career_stats")
    .select("*")
    .eq("player_id", player.id)
    .single();

  // Combine owned + member leagues, deduped
  const memberLeagueIds = new Set(
    (memberships ?? []).map((m) => {
      const l = m.leagues as unknown as { id: string };
      return l?.id;
    })
  );

  const extraOwned = (ownedLeagues ?? []).filter(
    (l) => !memberLeagueIds.has(l.id)
  );

  return (
    <main className="container py-8 space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hey, {player.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{player.handle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leagues/join"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition"
          >
            Join a league
          </Link>
          <Link
            href="/onboarding/league"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Start a league
          </Link>
        </div>
      </div>

      {/* Career Stats Quick Look */}
      {careerStats && careerStats.gp > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Career Stats</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {[
              { label: "GP", value: careerStats.gp },
              { label: "AVG", value: Number(careerStats.avg).toFixed(3).replace(/^0/, "") },
              { label: "HR", value: careerStats.hr },
              { label: "RBI", value: careerStats.rbi },
              { label: "OBP", value: Number(careerStats.obp).toFixed(3).replace(/^0/, "") },
              { label: "SLG", value: Number(careerStats.slg).toFixed(3).replace(/^0/, "") },
              { label: "H", value: careerStats.h },
              { label: "XBH", value: careerStats.xbh },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-md border border-border p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Leagues */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My Leagues</h2>

        {(memberships?.length ?? 0) === 0 && extraOwned.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              You&apos;re not in any leagues yet.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/leagues/join"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition"
              >
                Join with a code
              </Link>
              <Link
                href="/onboarding/league"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Create a league
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(memberships ?? []).map((m) => {
              const league = m.leagues as unknown as {
                id: string;
                name: string;
                sport: string;
                season: string | null;
                status: string;
                join_code: string;
              };
              if (!league) return null;
              return (
                <Link
                  key={m.id}
                  href={`/leagues/${league.id}`}
                  className="rounded-md border border-border p-4 hover:bg-accent/50 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{league.name}</h3>
                    <span className="text-xs capitalize rounded-full bg-secondary px-2 py-0.5">
                      {m.role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {league.sport} {league.season ? `· ${league.season}` : ""}
                  </p>
                  {m.team_name && (
                    <p className="text-xs text-muted-foreground">
                      Team: {m.team_name}
                    </p>
                  )}
                </Link>
              );
            })}

            {extraOwned.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="rounded-md border border-border p-4 hover:bg-accent/50 transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{league.name}</h3>
                  <span className="text-xs capitalize rounded-full bg-secondary px-2 py-0.5">
                    owner
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {league.sport} {league.season ? `· ${league.season}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
