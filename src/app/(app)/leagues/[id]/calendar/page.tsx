import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLeagueRole } from "@/lib/auth-helpers";
import ScheduleCalendar from "@/components/schedule-calendar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", id)
    .single();
  return { title: league?.name ? `${league.name} - Calendar` : "Schedule" };
}

export default async function CalendarPage({
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
    .select("*, schedule_published")
    .eq("id", id)
    .single();

  if (!league) notFound();

  const role = await getLeagueRole(supabase, id, user.id);

  // Players can only see published schedules
  const canEdit = role === "master" || role === "league_admin" || role === "team_manager";
  const schedulePublished = league.schedule_published ?? false;

  if (!canEdit && !schedulePublished) {
    return (
      <main className="container py-8">
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground text-lg">
            The schedule hasn&apos;t been published yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Check back later or ask your league admin.
          </p>
          <Link
            href={`/leagues/${id}`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Back to league
          </Link>
        </div>
      </main>
    );
  }

  // Fetch games
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", id)
    .neq("status", "voided")
    .order("game_date", { ascending: true });

  // Get unique teams
  const { data: memberships } = await supabase
    .from("league_memberships")
    .select("team_name")
    .eq("league_id", id)
    .is("left_at", null);

  const teams = Array.from(
    new Set((memberships || []).map((m) => m.team_name).filter(Boolean))
  ).sort() as string[];

  return (
    <main className="container py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{league.name} - Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {league.sport} {league.season ? `· ${league.season}` : ""}
            {schedulePublished ? "" : " · Draft (not published)"}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/leagues/${id}/schedule`}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition"
            >
              Schedule Builder
            </Link>
          )}
          <Link
            href={`/leagues/${id}`}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Back to league
          </Link>
        </div>
      </div>

      <ScheduleCalendar
        leagueId={id}
        games={(games || []).map((g) => ({
          id: g.id,
          game_date: g.game_date,
          start_time: g.start_time,
          home_team: g.home_team,
          away_team: g.away_team,
          home_score: g.home_score,
          away_score: g.away_score,
          status: g.status,
          notes: g.notes,
          field_name: g.field_name ?? null,
          location: g.location ?? null,
          duration_minutes: g.duration_minutes ?? null,
        }))}
        teams={teams}
        canEdit={canEdit}
        schedulePublished={schedulePublished}
      />
    </main>
  );
}
