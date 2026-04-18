"use client";

import {
  submitPlayerGameStats,
  type GameActionState,
} from "@/lib/actions/game";
import { useActionState, useState } from "react";

type RosterPlayer = {
  membershipId: string;
  displayName: string;
  handle: string;
  teamName: string | null;
};

export function StatEntryForm({
  gameId,
  roster,
}: {
  gameId: string;
  roster: RosterPlayer[];
}) {
  const [selectedPlayer, setSelectedPlayer] = useState("");

  const boundAction = submitPlayerGameStats.bind(null, gameId);
  const [state, action, pending] = useActionState<GameActionState, FormData>(
    boundAction,
    {}
  );

  const statFields = [
    { name: "pa", label: "PA", tip: "Plate appearances" },
    { name: "ab", label: "AB", tip: "At bats" },
    { name: "r", label: "R", tip: "Runs" },
    { name: "h", label: "H", tip: "Hits" },
    { name: "doubles", label: "2B", tip: "Doubles" },
    { name: "triples", label: "3B", tip: "Triples" },
    { name: "hr", label: "HR", tip: "Home runs" },
    { name: "rbi", label: "RBI", tip: "Runs batted in" },
    { name: "bb", label: "BB", tip: "Walks" },
    { name: "so", label: "SO", tip: "Strikeouts" },
    { name: "sf", label: "SF", tip: "Sac flies" },
    { name: "hbp", label: "HBP", tip: "Hit by pitch" },
    { name: "ab_risp", label: "AB RISP", tip: "ABs with RISP" },
    { name: "h_risp", label: "H RISP", tip: "Hits with RISP" },
  ];

  return (
    <form action={action} className="space-y-4 rounded-md border border-border p-4">
      {/* Player selector */}
      <div className="space-y-2">
        <label htmlFor="membership_id" className="text-sm font-medium">
          Player
        </label>
        <select
          id="membership_id"
          name="membership_id"
          required
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a player...</option>
          {roster.map((p) => (
            <option key={p.membershipId} value={p.membershipId}>
              {p.displayName} (@{p.handle})
              {p.teamName ? ` — ${p.teamName}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {statFields.map((f) => (
          <div key={f.name} className="space-y-1">
            <label
              htmlFor={f.name}
              className="text-xs font-medium text-muted-foreground"
              title={f.tip}
            >
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type="number"
              min={0}
              defaultValue={0}
              required
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-center"
            />
          </div>
        ))}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state.fieldErrors && (
        <p className="text-sm text-destructive">
          Please check your stat entries — all fields must be valid numbers.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !selectedPlayer}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save stats"}
      </button>
    </form>
  );
}
