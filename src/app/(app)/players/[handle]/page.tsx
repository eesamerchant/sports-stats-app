import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatRate } from "@/lib/stats";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("display_name")
    .eq("handle", handle)
    .single();
  return { title: player?.display_name ?? handle };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!player) notFound();

  const { data: careerStats } = await supabase
    .from("player_career_stats")
    .select("*")
    .eq("player_id", player.id)
    .single();

  const { data: leagueStats } = await supabase
    .from("player_league_stats")
    .select("*")
    .eq("player_id", player.id);

  const batsLabel: Record<string, string> = { L: "Left", R: "Right", S: "Switch" };
  const throwsLabel: Record<string, string> = { L: "Left", R: "Right" };

  const initials = player.display_name
    .split(" ")
    .map(function (n: string) { return n[0]; })
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="container py-8 space-y-8">
      <div className="flex items-start gap-4">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.display_name}
            className="h-16 w-16 rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary text-xl font-bold">
            {initials}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{player.display_name}</h1>
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary">
              #{player.player_number}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">@{player.handle}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {player.bats && <span>Bats: {batsLabel[player.bats]}</span>}
            {player.throws && <span>Throws: {throwsLabel[player.throws]}</span>}
            {player.hometown && <span>{player.hometown}</span>}
          </div>
          {player.bio && (
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              {player.bio}
            </p>
          )}
        </div>
      </div>

      {careerStats && careerStats.gp > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Career Totals</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 px-2 font-medium text-center">GP</th>
                  <th className="pb-2 px-2 font-medium text-center">AB</th>
                  <th className="pb-2 px-2 font-medium text-center">R</th>
                  <th className="pb-2 px-2 font-medium text-center">H</th>
                  <th className="pb-2 px-2 font-medium text-center">2B</th>
                  <th className="pb-2 px-2 font-medium text-center">3B</th>
                  <th className="pb-2 px-2 font-medium text-center">HR</th>
                  <th className="pb-2 px-2 font-medium text-center">RBI</th>
                  <th className="pb-2 px-2 font-medium text-center">BB</th>
                  <th className="pb-2 px-2 font-medium text-center">SO</th>
                  <th className="pb-2 px-2 font-medium text-center">AVG</th>
                  <th className="pb-2 px-2 font-medium text-center">OBP</th>
                  <th className="pb-2 px-2 font-medium text-center">SLG</th>
                  <th className="pb-2 px-2 font-medium text-center">OPS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-2 text-center">{careerStats.gp}</td>
                  <td className="py-2 px-2 text-center">{careerStats.ab}</td>
                  <td className="py-2 px-2 text-center">{careerStats.r}</td>
                  <td className="py-2 px-2 text-center">{careerStats.h}</td>
                  <td className="py-2 px-2 text-center">{careerStats.doubles}</td>
                  <td className="py-2 px-2 text-center">{careerStats.triples}</td>
                  <td className="py-2 px-2 text-center">{careerStats.hr}</td>
                  <td className="py-2 px-2 text-center">{careerStats.rbi}</td>
                  <td className="py-2 px-2 text-center">{careerStats.bb}</td>
                  <td className="py-2 px-2 text-center">{careerStats.so}</td>
                  <td className="py-2 px-2 text-center font-mono">{formatRate(Number(careerStats.avg))}</td>
                  <td className="py-2 px-2 text-center font-mono">{formatRate(Number(careerStats.obp))}</td>
                  <td className="py-2 px-2 text-center font-mono">{formatRate(Number(careerStats.slg))}</td>
                  <td className="py-2 px-2 text-center font-mono">{formatRate(Number(careerStats.obp) + Number(careerStats.slg))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="text-muted-foreground">No stats recorded yet.</p>
        </section>
      )}

      {leagueStats && leagueStats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">By League</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium">League</th>
                  <th className="pb-2 px-2 font-medium text-center">GP</th>
                  <th className="pb-2 px-2 font-medium text-center">AB</th>
                  <th className="pb-2 px-2 font-medium text-center">H</th>
                  <th className="pb-2 px-2 font-medium text-center">HR</th>
                  <th className="pb-2 px-2 font-medium text-center">RBI</th>
                  <th className="pb-2 px-2 font-medium text-center">AVG</th>
                  <th className="pb-2 px-2 font-medium text-center">OBP</th>
                  <th className="pb-2 px-2 font-medium text-center">SLG</th>
                </tr>
              </thead>
              <tbody>
                {leagueStats.map(function (s) {
                  return (
                    <tr key={s.league_id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <Link href={"/leagues/" + s.league_id} className="font-medium hover:underline">
                          {s.league_name}
                        </Link>
                        {s.season && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({s.season})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">{s.gp}</td>
                      <td className="py-2 px-2 text-center">{s.ab}</td>
                      <td className="py-2 px-2 text-center">{s.h}</td>
                      <td className="py-2 px-2 text-center">{s.hr}</td>
                      <td className="py-2 px-2 text-center">{s.rbi}</td>
                      <td className="py-2 px-2 text-center font-mono">{formatRate(Number(s.avg))}</td>
                      <td className="py-2 px-2 text-center font-mono">{formatRate(Number(s.obp))}</td>
                      <td className="py-2 px-2 text-center font-mono">{formatRate(Number(s.slg))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
