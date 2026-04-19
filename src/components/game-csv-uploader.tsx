"use client";

import { useState } from "react";
import { CsvUploadForm } from "./csv-upload-form";

type Game = {
  id: string;
  game_date: string;
  home_team: string | null;
  away_team: string | null;
  status: string;
};

type RosterMember = {
  id: string;
  player_name: string;
  player_handle: string;
};

function downloadTemplate(roster: RosterMember[]) {
  const headers = "Player,PA,AB,R,H,2B,3B,HR,RBI,BB,SO,SF,HBP,AB_RISP,H_RISP";
  const rows = roster.map(
    (r) => `${r.player_name},0,0,0,0,0,0,0,0,0,0,0,0,0,0`
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game_stats_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function GameCsvUploader({
  games,
  roster,
}: {
  games: Game[];
  roster: RosterMember[];
}) {
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Select Game</label>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">Choose a game...</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.away_team ?? "Away"} @ {g.home_team ?? "Home"} —{" "}
                {new Date(g.game_date + "T00:00:00").toLocaleDateString()} (
                {g.status})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => downloadTemplate(roster)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition whitespace-nowrap"
        >
          Download Template CSV
        </button>
      </div>
      {selectedGameId && (
        <CsvUploadForm gameId={selectedGameId} roster={roster} />
      )}
    </div>
  );
}
