"use client";

import { createGame, type GameActionState } from "@/lib/actions/game";
import { useActionState } from "react";
import { useParams } from "next/navigation";

export default function NewGamePage() {
  const params = useParams<{ id: string }>();
  const [state, action, pending] = useActionState<GameActionState, FormData>(
    createGame,
    {}
  );

  return (
    <main className="container max-w-lg py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedule a game</h1>
        <p className="text-sm text-muted-foreground">
          Add a new game to the league schedule
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="league_id" value={params.id} />

        <div className="space-y-2">
          <label htmlFor="game_date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="game_date"
            name="game_date"
            type="date"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="away_team" className="text-sm font-medium">
              Away team
            </label>
            <input
              id="away_team"
              name="away_team"
              type="text"
              required
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Visitors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="home_team" className="text-sm font-medium">
              Home team
            </label>
            <input
              id="home_team"
              name="home_team"
              type="text"
              required
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Home"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            maxLength={500}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Field location, time, etc."
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create game"}
        </button>
      </form>
    </main>
  );
}
