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
      <div>
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
      {selectedGameId && (
        <CsvUploadForm gameId={selectedGameId} roster={roster} />
      )}
    </div>
  );
}
