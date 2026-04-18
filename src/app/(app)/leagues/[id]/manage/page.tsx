import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RosterManager } from "@/components/roster-manager";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league?.name ? `Manage ${league.name}` : "Manage League" };
}

export default async function ManageLeaguePage({
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

  // Fetch league
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (!league) notFound();

  // Check authorization: owner or manager role
  const isOwner = league.owner_id === user.id;

  let isManager = false;
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", id)
      .eq("player_id", (await supabase.auth.getUser()).data.user?.id)
      .is("left_at", null)
      .single();

    isManager = membership?.role === "manager";
  }

  if (!isOwner && !isManager) {
    notFound();
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

  const memberships = roster?.map((m) => ({
    id: m.id,
    playerId: m.player_id,
    role: m.role as "player" | "captain" | "scorer" | "manager",
    teamName: m.team_name,
    jerseyNumber: m.jersey_number,
    canScore: m.can_score,
    player: {
      id: (m.players as any)?.id,
      handle: (m.players as any)?.handle,
      displayName: (m.players as any)?.display_name,
    },
  })) ?? [];

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage {league.name}</h1>
          <p className="text-sm text-muted-foreground">
            {league.sport} {league.season ? `· ${league.season}` : ""}
          </p>
        </div>
        <Link
          href={`/leagues/${id}`}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:opacity-90 transition text-center"
        >
          Back to league
        </Link>
      </div>

      {/* Join Code Section */}
      <section className="rounded-md border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">Add Players</h2>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Share this join code with players to invite them to the league:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-secondary px-3 py-2 font-mono text-sm font-semibold">
              {league.join_code}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(league.join_code);
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* Roster Manager */}
      <RosterManager
        leagueId={id}
        memberships={memberships}
        isOwner={isOwner}
      />

      {/* Schedule Builder Link (placeholder) */}
      <section className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Create and manage your league schedule
        </p>
        <button
          disabled
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
        >
          Schedule Builder (coming soon)
        </button>
      </section>
    </main>
  );
}
