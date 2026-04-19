"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchLeagues, searchPlayers } from "@/lib/actions/search";
import type {
  LeagueSearchResult,
  PlayerSearchResult,
} from "@/lib/actions/search";

export function PublicSearch() {
  const [activeTab, setActiveTab] = useState<"leagues" | "players">("leagues");
  const [leagueQuery, setLeagueQuery] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [leagueResults, setLeagueResults] = useState<LeagueSearchResult[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerSearchResult[]>([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  // Debounced league search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leagueQuery.trim()) {
        setIsLoadingLeagues(true);
        searchLeagues(leagueQuery)
          .then(setLeagueResults)
          .finally(() => setIsLoadingLeagues(false));
      } else {
        setLeagueResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [leagueQuery]);

  // Debounced player search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerQuery.trim()) {
        setIsLoadingPlayers(true);
        searchPlayers(playerQuery)
          .then(setPlayerResults)
          .finally(() => setIsLoadingPlayers(false));
      } else {
        setPlayerResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [playerQuery]);

  return (
    <section className="w-full border-t border-border bg-card py-16">
      <div className="container space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Search leagues and players
          </h2>
          <p className="text-sm text-muted-foreground">
            Find leagues to join or view player stats
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveTab("leagues")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "leagues"
                ? "bg-primary text-primary-foreground"
                : "bg-input text-muted-foreground hover:text-foreground"
            }`}
          >
            Find a League
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "players"
                ? "bg-primary text-primary-foreground"
                : "bg-input text-muted-foreground hover:text-foreground"
            }`}
          >
            Find a Player
          </button>
        </div>

        {/* League Search */}
        {activeTab === "leagues" && (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by league name or join code..."
                value={leagueQuery}
                onChange={(e) => setLeagueQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Results */}
            <div className="space-y-2">
              {isLoadingLeagues && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!isLoadingLeagues && leagueResults.length === 0 && leagueQuery && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No leagues found
                </div>
              )}

              {!isLoadingLeagues &&
                leagueResults.length > 0 &&
                leagueResults.map((league) => (
                  <Link
                    key={league.id}
                    href={`/leagues/${league.id}`}
                    className="group block rounded-md border border-border bg-background p-4 transition hover:border-primary hover:bg-card"
                  >
                    <div className="flex items-start gap-3">
                      {league.logo_url && (
                        <img
                          src={league.logo_url}
                          alt={league.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition">
                          {league.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{league.sport}</span>
                          {league.season && <span>{league.season}</span>}
                          <span className="font-mono bg-input px-2 py-1 rounded">
                            {league.join_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Player Search */}
        {activeTab === "players" && (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by player name or handle..."
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Results */}
            <div className="space-y-2">
              {isLoadingPlayers && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!isLoadingPlayers && playerResults.length === 0 && playerQuery && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No players found
                </div>
              )}

              {!isLoadingPlayers &&
                playerResults.length > 0 &&
                playerResults.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.handle}`}
                    className="group block rounded-md border border-border bg-background p-4 transition hover:border-primary hover:bg-card"
                  >
                    <div className="flex items-start gap-3">
                      {player.photo_url && (
                        <img
                          src={player.photo_url}
                          alt={player.display_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition">
                          {player.display_name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          @{player.handle}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
