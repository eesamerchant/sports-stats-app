"use client";

import React, { useState } from "react";
import {
  BracketFormat,
  BracketMatchup,
  generateSingleElimination,
  generateDoubleElimination,
  generateBestOf,
  groupByRound,
  groupByBracketSide,
  getRoundName,
  bracketMatchupsToGames,
} from "@/lib/bracket-utils";
import { bulkCreateGames } from "@/lib/actions/schedule";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";

interface BracketBuilderProps {
  leagueId: string;
  teams: string[];
  existingGames: any[];
}

type BuilderMode = "setup" | "preview" | "live";

export default function BracketBuilder({
  leagueId,
  teams,
  existingGames,
}: BracketBuilderProps) {
  // Determine mode based on existing bracket games
  const hasBracketGames = existingGames.some(
    (g) => g.notes?.toLowerCase().includes("bracket") || g.notes?.toLowerCase().includes("playoff")
  );

  const [mode, setMode] = useState<BuilderMode>(hasBracketGames ? "live" : "setup");
  const [format, setFormat] = useState<BracketFormat>("single_elim");
  const [teamCount, setTeamCount] = useState<number>(4);
  const [seededTeams, setSeededTeams] = useState<string[]>(teams.slice(0, teamCount));
  const [matchups, setMatchups] = useState<BracketMatchup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");

  // Generate matchups when format or seeding changes
  const handleGenerateMatchups = () => {
    let newMatchups: BracketMatchup[] = [];

    if (format === "single_elim") {
      newMatchups = generateSingleElimination(seededTeams);
    } else if (format === "double_elim") {
      newMatchups = generateDoubleElimination(seededTeams);
    } else if (format === "best_of_3") {
      newMatchups = generateBestOf(seededTeams, 3);
    } else if (format === "best_of_5") {
      newMatchups = generateBestOf(seededTeams, 5);
    }

    setMatchups(newMatchups);
    setMode("preview");
  };

  const handleSeedChange = (index: number, direction: "up" | "down") => {
    const newSeeded = [...seededTeams];
    if (direction === "up" && index > 0) {
      [newSeeded[index], newSeeded[index - 1]] = [newSeeded[index - 1], newSeeded[index]];
    } else if (direction === "down" && index < newSeeded.length - 1) {
      [newSeeded[index], newSeeded[index + 1]] = [newSeeded[index + 1], newSeeded[index]];
    }
    setSeededTeams(newSeeded);
  };

  const handleTeamCountChange = (newCount: number) => {
    setTeamCount(newCount);
    const available = teams.slice(0, newCount);
    setSeededTeams(available);
  };

  const handleCreateBracket = async () => {
    try {
      setIsCreating(true);
      setError("");

      const games = bracketMatchupsToGames(matchups, new Date().toISOString().split("T")[0]);

      if (games.length === 0) {
        setError("No valid matchups to create. Please ensure teams are selected.");
        return;
      }

      const result = await bulkCreateGames(leagueId, games);

      if (result.error) {
        setError(result.error);
      } else {
        setMode("live");
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bracket");
    } finally {
      setIsCreating(false);
    }
  };

  // Setup Mode
  if (mode === "setup") {
    return (
      <div className="space-y-8">
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Format Selector */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Bracket Format</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "single_elim", label: "Single Elimination" },
              { value: "double_elim", label: "Double Elimination" },
              { value: "best_of_3", label: "Best of 3" },
              { value: "best_of_5", label: "Best of 5" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value as BracketFormat)}
                className={`rounded-md border-2 px-4 py-3 font-medium transition ${
                  format === f.value
                    ? "border-bg-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-primary-foreground hover:border-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Team Count Selector (for single/double elim) */}
        {(format === "single_elim" || format === "double_elim") && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Number of Teams</h2>
            <div className="grid gap-2 sm:grid-cols-4">
              {[2, 4, 8, 16].map((count) => (
                <button
                  key={count}
                  onClick={() => handleTeamCountChange(count)}
                  disabled={count > teams.length}
                  className={`rounded-md border-2 px-4 py-2 font-medium transition ${
                    teamCount === count
                      ? "border-primary bg-primary/10 text-primary"
                      : count > teams.length
                        ? "border-border bg-card text-muted-foreground opacity-50"
                        : "border-border bg-card text-primary-foreground hover:border-primary"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {teams.length} teams available. Select how many to include.
            </p>
          </section>
        )}

        {/* Seeding */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Seeding (Drag to Reorder)</h2>
          <p className="text-sm text-muted-foreground">
            Seed #1 gets a bye in most brackets. Reorder teams using the up/down arrows.
          </p>
          <div className="space-y-2">
            {seededTeams.map((team, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary font-semibold text-sm">
                  #{idx + 1}
                </div>
                <span className="flex-1 font-medium">{team}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSeedChange(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-50"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSeedChange(idx, "down")}
                    disabled={idx === seededTeams.length - 1}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-50"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preview Button */}
        <button
          onClick={handleGenerateMatchups}
          className="w-full rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Preview Bracket
        </button>
      </div>
    );
  }

  // Preview Mode
  if (mode === "preview" && matchups.length > 0) {
    return (
      <div className="space-y-8">
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        <button
          onClick={() => setMode("setup")}
          className="text-sm text-muted-foreground hover:text-primary-foreground transition"
        >
          ← Back to Setup
        </button>

        <BracketVisualization matchups={matchups} format={format} />

        <button
          onClick={handleCreateBracket}
          disabled={isCreating}
          className="w-full rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Bracket...
            </>
          ) : (
            "Confirm & Create Bracket"
          )}
        </button>
      </div>
    );
  }

  // Live Mode
  if (mode === "live") {
    const liveMatchups = bracketGamesToBracketMatchups(existingGames);
    return (
      <div className="space-y-8">
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-500">
          Bracket is live with {existingGames.length} games.
        </div>
        {liveMatchups.length > 0 && (
          <BracketVisualization matchups={liveMatchups} format={format} live={true} />
        )}
      </div>
    );
  }

  return null;
}

// Bracket Visualization Component
interface BracketVisualizationProps {
  matchups: BracketMatchup[];
  format: BracketFormat;
  live?: boolean;
}

function BracketVisualization({ matchups, format, live = false }: BracketVisualizationProps) {
  if (format === "double_elim") {
    const { winners, losers } = groupByBracketSide(matchups);
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Winners Bracket</h3>
          <SingleBracketView matchups={winners} live={live} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Losers Bracket</h3>
          <SingleBracketView matchups={losers} live={live} />
        </div>
      </div>
    );
  }

  return <SingleBracketView matchups={matchups} live={live} />;
}

// Single Bracket View (reusable for winners/losers)
function SingleBracketView({
  matchups,
  live = false,
}: {
  matchups: BracketMatchup[];
  live?: boolean;
}) {
  const roundGroups = groupByRound(matchups);
  const totalRounds = Math.max(...Array.from(roundGroups.keys()));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4 bg-secondary/30 rounded-md">
        {Array.from(roundGroups.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([round, roundMatchups]) => (
            <div key={round} className="flex flex-col gap-4 min-w-[200px]">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {getRoundName(round, totalRounds)}
              </h4>
              <div className="flex flex-col gap-3 justify-around">
                {roundMatchups.map((matchup) => (
                  <MatchupCard key={matchup.id} matchup={matchup} live={live} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Matchup Card Component
function MatchupCard({ matchup, live = false }: { matchup: BracketMatchup; live?: boolean }) {
  const homeWon = matchup.winner === matchup.home_team;
  const awayWon = matchup.winner === matchup.away_team;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden text-sm">
      {/* Home Team */}
      <div
        className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 ${
          homeWon ? "bg-primary/10" : awayWon ? "bg-secondary/50 opacity-60" : ""
        }`}
      >
        <span className="text-xs text-muted-foreground min-w-[24px]">
          {matchup.home_seed ? `#${matchup.home_seed}` : ""}
        </span>
        <span className="flex-1 truncate font-medium">
          {matchup.home_team ? (
            matchup.home_team
          ) : (
            <span className="text-muted-foreground italic">TBD</span>
          )}
        </span>
        {live && matchup.home_score !== null && (
          <span className="font-semibold min-w-[28px] text-right">
            {matchup.home_score}
          </span>
        )}
      </div>

      {/* Away Team */}
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          awayWon ? "bg-primary/10" : homeWon ? "bg-secondary/50 opacity-60" : ""
        }`}
      >
        <span className="text-xs text-muted-foreground min-w-[24px]">
          {matchup.away_seed ? `#${matchup.away_seed}` : ""}
        </span>
        <span className="flex-1 truncate font-medium">
          {matchup.away_team ? (
            matchup.away_team
          ) : (
            <span className="text-muted-foreground italic">TBD</span>
          )}
        </span>
        {live && matchup.away_score !== null && (
          <span className="font-semibold min-w-[28px] text-right">
            {matchup.away_score}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper function to convert bracket games back to matchups for live view
function bracketGamesToBracketMatchups(games: any[]): BracketMatchup[] {
  const bracketGames = games.filter(
    (g) =>
      g.notes?.toLowerCase().includes("bracket") ||
      g.notes?.toLowerCase().includes("playoff")
  );

  return bracketGames.map((game, idx) => ({
    id: game.id,
    round: game.notes?.match(/round (\d+)/i)?.[1] ? parseInt(game.notes.match(/round (\d+)/i)[1]) : 1,
    position: idx,
    home_seed: null,
    away_seed: null,
    home_team: game.home_team,
    away_team: game.away_team,
    home_score: game.home_score,
    away_score: game.away_score,
    winner: game.status === "final" ? (game.home_score > game.away_score ? game.home_team : game.away_team) : null,
    bracket_side: game.notes?.includes("losers") ? "losers" : "winners",
  }));
}
